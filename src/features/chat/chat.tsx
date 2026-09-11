import { useEffect, useRef, useState } from "react";
import "./chat.css";
import { useSelector } from "react-redux";
import { useAppDispatch } from "../../store/store";
import type {
  CodeInterpreterContent,
  CodeInterpreterFileRef,
  ContentPart,
  FileAttachment,
  FileInput,
  ImageUrlContent,
  LLMFileUploadResponse,
  LLMMessage,
  TextAttachment,
  TextContent,
} from "../../types";

import { updateChatMode } from "./chat_mode_slice";
import { api, type StreamChunk } from "./api";
import { BotMessage } from "./bot_message";
import { appendCacheMessage, clearCacheMessage, closeWindow, endSessionStream, loadMessages, loadSessions, newSession, openWindow, replaceLastMessage, setChatMode, startSessionStream } from "./session_slice_practice";
import { FileComponent } from "./file_component";
import { CodeInterpreterCard } from "./code_interpreter_card";
import { ToolCallCard } from "./tool_call_card";
import { ThinkingOwl, OwlMark } from "./owl_icon";


export interface ChatPageProps {
  windowId: string;
  title?: string;
  welcomeMessage?: string;
  showTopBar?: boolean;
  className?: string;
}

type ToolInfo = {
  name: string;
  args: string;
  done: boolean;
  result?: string;
  source: "function" | "mcp" | "code_interpreter";
  serverLabel?: string;
  code?: string;                     // code_interpreter only — accumulated as it streams in
  status?: string;                   // code_interpreter only — "in_progress" | "interpreting" | "completed" | "failed"
  files?: CodeInterpreterFileRef[];  // code_interpreter only — generated files
};
const RAG_TOOL_NAME = "search_knowledge_base";
function extractSourceFilenames(output: string | undefined): string[] {
  if (!output) return [];
  try {
    const parsed = JSON.parse(output);
    const results = parsed?.results;
    if (!Array.isArray(results)) return [];
    return results
      .map((r: any) => r?.source_file)
      .filter((f: unknown): f is string => typeof f === "string" && f.length > 0)
      .map((f: string) => f.split("/").pop() || f);
  } catch {
    return [];
  }
}

function getSourcesForAssistantMessage(messages: LLMMessage[], assistantIndex: number): string[] {
  let start = 0;
  for (let i = assistantIndex - 1; i >= 0; i--) {
    if ((messages[i] as any).role === "user") {
      start = i + 1;
      break;
    }
  }

  const toolCallNames: Record<string, string> = {};
  const sources = new Set<string>();

  for (let i = start; i < assistantIndex; i++) {
    const m = messages[i] as any;
    if (m.role === "tool_call" && m.tool_call_id && m.name) {
      toolCallNames[m.tool_call_id] = m.name;
    }
    if (m.role === "tool_call_output" && m.tool_call_id) {
      const name = toolCallNames[m.tool_call_id];
      if (name === RAG_TOOL_NAME) {
        const outputStr = typeof m.output === "string" ? m.output : JSON.stringify(m.output);
        extractSourceFilenames(outputStr).forEach((f) => sources.add(f));
      }
    }
  }

  return Array.from(sources);
}

type SessionStreamState = {
  buffer: string;
  botMessageAdded: boolean;
  activeTools: Record<string, ToolInfo>;
  mcpStatus: string;
  sources: string[];
};

export const ChatPage = ({
  windowId,
  title = "Owl Bot",
  welcomeMessage = "Hello How Are You",
  showTopBar = true,
  className = "",
}: ChatPageProps) => {
  const dispatch = useAppDispatch();
  const chatMode = useSelector((state: any) => state.session.windows[windowId]?.chatMode ?? false);
  const activeSessionId = useSelector((state: any) => state.session.windows[windowId]?.activeSessionId ?? null);
  const cacheMessages = useSelector((state: any) => state.session.windows[windowId]?.cacheChatMessages ?? []);
  const streamingSessionIds: string[] = useSelector((state: any) => state.session.streamingSessionIds ?? []);
  const isStreaming = activeSessionId ? streamingSessionIds.includes(activeSessionId) : false;
  const [mcpStatus, setMcpStatus] = useState("");
  const [streamError, setStreamError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pastedTexts, setPastedTexts] = useState<TextAttachment[]>([]);

  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [uploadResults, setUploadResults] = useState<(LLMFileUploadResponse | undefined)[]>([]);
  const [uploadErrors, setUploadErrors] = useState<(string | undefined)[]>([]);
  const [activeTools, setActiveTools] = useState<Record<string, ToolInfo>>({});
  const pageRef = useRef<HTMLDivElement>(null);
  const pinnedToUserRef = useRef(false);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sessionStreamsRef = useRef<Record<string, SessionStreamState>>({});
  const activeSessionIdRef = useRef<string | null>(activeSessionId);
  const filesRef = useRef<FileAttachment[]>(files);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  const streamingSessionIdsRef = useRef<string[]>(streamingSessionIds);

  useEffect(() => {
    streamingSessionIdsRef.current = streamingSessionIds;
  }, [streamingSessionIds]);

  useEffect(() => {
    dispatch(openWindow({ windowId }));
    return () => {
      dispatch(closeWindow({ windowId }));
    };
  }, []);

  useEffect(() => {
    dispatch(loadSessions());
  }, []);

  useEffect(() => {
    if (activeSessionId) {
      dispatch(loadMessages({ windowId, sessionId: activeSessionId }));
    }
  }, [activeSessionId]);

  useEffect(() => {
    if (!chatMode) dispatch(clearCacheMessage({ windowId }));
  }, [chatMode]);

  useEffect(() => {
    return () => {
      if (streamingSessionIdsRef.current.length > 0) {
        api.abortChat();
      }
    };
  }, []);

  useEffect(() => {
    const cont = pageRef.current;
    if (!cont || cacheMessages.length === 0) return;
    const lastMsg = cacheMessages[cacheMessages.length - 1];

    if (lastMsg.role === "user") {
      const userIndex = cacheMessages.length - 1;
      if (userIndex !== lastScrolledIndex.current) {
        lastScrolledIndex.current = userIndex;
        pinnedToUserRef.current = true;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = lastUserMsgRef.current;
            if (!el) return;
            el.scrollIntoView({ block: "start", behavior: "smooth" });
          });
        });
      }
      return;
    }

    if (lastMsg.role === "assistant" && bottomAnchorRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const c = pageRef.current;
          const anchor = bottomAnchorRef.current;
          if (!c || !anchor) return;

          const cr = c.getBoundingClientRect();
          const ar = anchor.getBoundingClientRect();

          if (pinnedToUserRef.current) {
            if (ar.top > cr.bottom + 20) {
              pinnedToUserRef.current = false;
            } else {
              return;
            }
          }

          if (ar.top > cr.bottom + 300) return;
          if (ar.top < cr.bottom - 100) return;

          c.scrollTo({
            top: Math.max(0, ar.top - cr.top + c.scrollTop - c.clientHeight + 60),
            behavior: "smooth",
          });
        });
      });
      return;
    }
  }, [cacheMessages]);

  // ── helpers ────────────────────────────────────────────────────────────────
  // extraParts carries code_interpreter content parts (see the isDone
  // handling below) — without it, the code interpreter card only ever
  // exists in the transient `activeTools` state and disappears the instant
  // resetSessionStream() clears that state at the end of the turn, even
  // though the card (and any generated image) rendered correctly moments
  // earlier while the reply was still streaming.
  function updateBotMessage(sessionState: SessionStreamState, text: string, extraParts: ContentPart[] = []) {
    const messagePayload = {
      type: "message",
      role: "assistant",
      content: [{ type: "text", text }, ...extraParts],
      sources: sessionState.sources.length ? sessionState.sources : undefined,
    } as LLMMessage;

    if (!sessionState.botMessageAdded) {
      sessionState.botMessageAdded = true;
      dispatch(appendCacheMessage({
        windowId,
        messages: [messagePayload],
      }));
    } else {
      dispatch(replaceLastMessage({
        windowId,
        message: messagePayload,
      }));
    }
  }

  const fileAccumulator = files.map((_, i) => ({
    fileId: uploadResults[i]?.fileId,
    error: uploadErrors[i],
  }));

  const uploadOneFile = async (file: FileAttachment, index: number) => {
    try {
      const res = await api.uploadFile(file.file);
      setUploadResults((prev) => {
        const next = [...prev];
        next[index] = res;
        return next;
      });
    } catch (err: any) {
      setUploadErrors((prev) => {
        const next = [...prev];
        next[index] = err?.message ?? "Upload failed";
        return next;
      });
    }
  };

  // Single entry point for adding attachments — used by both the file picker
  // and paste, so every attachment (including pasted images) goes through
  // the same state + upload pipeline instead of being dropped in a dead state.
  const addAttachments = (newAttachments: FileAttachment[]) => {
    if (!newAttachments.length) return;
    const startIndex = filesRef.current.length;

    setFiles((prev) => [...prev, ...newAttachments]);
    setUploadResults((prev) => [...prev, ...newAttachments.map(() => undefined)]);
    setUploadErrors((prev) => [...prev, ...newAttachments.map(() => undefined)]);

    newAttachments.forEach((attachment, offset) => {
      uploadOneFile(attachment, startIndex + offset);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const newAttachments: FileAttachment[] = Array.from(selectedFiles).map((file) => ({
      name: file.name,
      extension: file.name.split(".").pop() ?? "",
      file,
      isImage: file.type.startsWith("image/"),
    }));

    addAttachments(newAttachments);
    e.target.value = ""; // lets picking the same file again re-trigger onChange
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadResults((prev) => prev.filter((_, i) => i !== index));
    setUploadErrors((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData.items);
    const imageItems = items.filter((i) => i.type.startsWith("image/"));
    if (imageItems.length) {
      e.preventDefault();
      const newAttachments: FileAttachment[] = [];
      for (const item of imageItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const extension = file.type.split("/").pop() ?? "png";
        newAttachments.push({
          name: file.name || `pasted-image-${Date.now()}.${extension}`,
          extension,
          file,
          isImage: true,
        });
      }
      addAttachments(newAttachments);
      return;
    }

    const fileItems = items.filter((i) => i.kind === "file" && !i.type.startsWith("image/"));
    if (fileItems.length) {
      e.preventDefault();
      const newAttachments: FileAttachment[] = [];
      for (const item of fileItems) {
        const file = item.getAsFile();
        if (!file) continue;
        const extension = file.name.split(".").pop() ?? "FILE";
        newAttachments.push({ name: file.name, extension, file, isImage: false });
      }
      addAttachments(newAttachments);
      return;
    }

    const text = e.clipboardData.getData("text");
    if (text.length > 500) {
      e.preventDefault();
      setPastedTexts((prev) => [...prev, { name: `Pasted text (${prev.length + 1})`, content: text }]);
    }
  };

  const resetSessionStream = (sessionId: string) => {
    delete sessionStreamsRef.current[sessionId];
    dispatch(endSessionStream({ sessionId }));
    if (sessionId === activeSessionIdRef.current) {
      setActiveTools({});
      setMcpStatus("");
      pinnedToUserRef.current = false;
    }
  };

  const handleSend = async () => {
    const llmUploadResponse = uploadResults.filter((r): r is LLMFileUploadResponse => !!r);
    if (!input.trim() && !llmUploadResponse.length && !pastedTexts.length) return;

    let sessionId: string | null = activeSessionId;
    if (!sessionId) {
      const result = await dispatch(newSession({ windowId }));
      if (newSession.fulfilled.match(result)) {
        sessionId = result.payload.session.id;
      } else {
        setStreamError("Failed to start a new session");
        return;
      }
    }

    if (streamingSessionIds.includes(sessionId)) return;

    if (!chatMode) {
      dispatch(setChatMode({ windowId, chatMode: true }));
      dispatch(updateChatMode({ chatMode: true, currentSessionId: sessionId }));
    }

    const content: ContentPart[] = [];
    if (input.trim()) {
      content.push({ type: "text", text: input.trim() } as TextContent);
    }
    for (const pastedText of pastedTexts) {
      content.push({ type: "text", text: pastedText.content } as TextContent);
    }
    for (const response of llmUploadResponse) {
      if (response.isImage) {
        // Backend's message_repository.ts KNOWN_TYPES allowlist (and
        // openai_provider.ts's fromInput switch) only recognize
        // "input_url_image" with a nested image_url.url — "input_image"
        // was silently stripped out on reload, which is why the model
        // never actually saw the image.
        content.push({
          type: "input_url_image",
          image_url: { url: response.url, detail: "auto" },
        } as ImageUrlContent);
      } else {
        content.push({
          type: "input_file",
          file_id: response.fileId,
          fileName: response.name,
          fileExtension: response.extension,
          fileUrl: response.url,
          // Only set for csv/xls/xlsx — see storage_routes.ts's
          // uploadAndIndex(). openai_provider.ts reads this back out of the
          // saved conversation to attach the file to the code interpreter
          // container's file_ids on every turn.
          openaiFileId: response.openaiFileId,
        } as FileInput);
      }
    }

    const messageToSend: LLMMessage = { type: "message", role: "user", content };
    activeSessionIdRef.current = sessionId
    if (sessionId === activeSessionIdRef.current) {
      dispatch(appendCacheMessage({ windowId, messages: [messageToSend] }));
    }

    const sessionIdForStream = sessionId;
    sessionStreamsRef.current[sessionIdForStream] = {
      buffer: "",
      botMessageAdded: false,
      activeTools: {},
      mcpStatus: "",
      sources: [],
    };
    dispatch(startSessionStream({ sessionId: sessionIdForStream }));

    setInput("");
    setPastedTexts([]);
    setFiles([]);
    setUploadResults([]);
    setUploadErrors([]);
    setStreamError(null);

    const isVisible = () => sessionIdForStream === activeSessionIdRef.current;

    await api.sendMessage(sessionIdForStream, messageToSend, (chunk: StreamChunk) => {
      console.log(chunk);
      const s = sessionStreamsRef.current[sessionIdForStream];
      if (!s) return;

      if (chunk.type === "error") {
        console.error("Stream error:", chunk.code, chunk.message);
        if (isVisible()) setStreamError(chunk.message ?? "Something went wrong");
        resetSessionStream(sessionIdForStream);
        return;
      }

      if (chunk.type === "function_call" && chunk.tool_call_id) {
        s.activeTools = {
          ...s.activeTools,
          [chunk.tool_call_id]: { name: chunk.name ?? "", args: "", done: false, source: "function" },
        };
        if (isVisible()) setActiveTools(s.activeTools);
      }

      if (chunk.type === "function_call_args" && chunk.tool_call_id) {
        s.activeTools = {
          ...s.activeTools,
          [chunk.tool_call_id]: { ...s.activeTools[chunk.tool_call_id], args: chunk.args ?? "" },
        };
        if (isVisible()) setActiveTools(s.activeTools);
      }

      if (chunk.type === "function_call_output" && chunk.tool_call_id) {
        s.activeTools = {
          ...s.activeTools,
          [chunk.tool_call_id]: { ...s.activeTools[chunk.tool_call_id], done: true, result: chunk.output },
        };
        if (isVisible()) setActiveTools(s.activeTools);
        const calledToolName = s.activeTools[chunk.tool_call_id]?.name;
        if (calledToolName === RAG_TOOL_NAME) {
          const filenames = extractSourceFilenames(chunk.output);
          if (filenames.length) {
            s.sources = Array.from(new Set([...s.sources, ...filenames]));
            if (isVisible() && s.botMessageAdded) {
              updateBotMessage(s, s.buffer);
            }
          }
        }
      }
      if (chunk.type === "mcp_call_arguments" && chunk.tool_call_id) {
        s.activeTools = {
          ...s.activeTools,
          [chunk.tool_call_id]: { ...s.activeTools[chunk.tool_call_id], args: chunk.args ?? "" },
        };
        if (isVisible()) setActiveTools(s.activeTools);
      }

      if (chunk.type === "mcp_call_output" && chunk.tool_call_id) {
        s.activeTools = {
          ...s.activeTools,
          [chunk.tool_call_id]: { ...s.activeTools[chunk.tool_call_id], done: true, result: chunk.output },
        };
        if (isVisible()) setActiveTools(s.activeTools);
      }

      if (chunk.type === "mcp_list_tools") {
        const toolNames = Array.isArray(chunk.tools) ? chunk.tools.map((t: any) => t.name).join(", ") : "";
        s.mcpStatus = `Connected to ${chunk.server_label ?? "MCP server"}${toolNames ? ` (${toolNames})` : ""}`;
        if (isVisible()) setMcpStatus(s.mcpStatus);
      }

      if (chunk.type === "mcp_approval_request") {
        s.mcpStatus = `Waiting for approval to run "${chunk.name}" on ${chunk.server_label ?? "MCP server"}`;
        if (isVisible()) setMcpStatus(s.mcpStatus);
      }

      if (chunk.type === "code_interpreter_call" && chunk.tool_call_id) {
        s.activeTools = {
          ...s.activeTools,
          [chunk.tool_call_id]: {
            name: "Code Interpreter",
            args: "",
            done: false,
            source: "code_interpreter",
            code: "",
            status: "in_progress",
            files: [],
          },
        };
        if (isVisible()) setActiveTools(s.activeTools);
      }

      if (chunk.type === "code_interpreter_call_code_delta" && chunk.tool_call_id) {
        const existing = s.activeTools[chunk.tool_call_id];
        if (existing) {
          s.activeTools = {
            ...s.activeTools,
            [chunk.tool_call_id]: { ...existing, code: (existing.code ?? "") + (chunk.delta ?? "") },
          };
          if (isVisible()) setActiveTools(s.activeTools);
        }
      }

      if (chunk.type === "code_interpreter_call_code_done" && chunk.tool_call_id) {
        const existing = s.activeTools[chunk.tool_call_id];
        if (existing) {
          s.activeTools = {
            ...s.activeTools,
            [chunk.tool_call_id]: { ...existing, code: chunk.code ?? existing.code },
          };
          if (isVisible()) setActiveTools(s.activeTools);
        }
      }

      if (chunk.type === "code_interpreter_call_status" && chunk.tool_call_id) {
        const existing = s.activeTools[chunk.tool_call_id];
        if (existing) {
          s.activeTools = {
            ...s.activeTools,
            [chunk.tool_call_id]: {
              ...existing,
              status: chunk.status,
              done: chunk.status === "completed" || chunk.status === "failed",
            },
          };
          if (isVisible()) setActiveTools(s.activeTools);
        }
      }

      if (chunk.type === "code_interpreter_file") {
        // OpenAI cites generated files on the response text, not tied to a
        // specific call id — in practice there's only ever one open code
        // interpreter call per turn, so attribute the file to the most
        // recently started one still in this turn's activeTools.
        const codeInterpreterEntries = Object.entries(s.activeTools).filter(([, t]) => t.source === "code_interpreter");
        const targetId = codeInterpreterEntries[codeInterpreterEntries.length - 1]?.[0];
        if (targetId && chunk.file_id && chunk.container_id) {
          const existing = s.activeTools[targetId];
          const files = [...(existing.files ?? []), { file_id: chunk.file_id, container_id: chunk.container_id, filename: chunk.filename, url: (chunk as any).url }];
          s.activeTools = { ...s.activeTools, [targetId]: { ...existing, files } };
          if (isVisible()) setActiveTools(s.activeTools);
        }
      }

      if (chunk.type === "sources" && Array.isArray((chunk as any).sources)) {
        const incoming = (chunk as any).sources as string[];
        s.sources = Array.from(new Set([...s.sources, ...incoming]));
        if (isVisible() && s.botMessageAdded) {
          updateBotMessage(s, s.buffer);
        }
      }

      if (chunk.type === "session_title") {
        dispatch(loadSessions());
      }

      if (chunk.content) {
        for (const c of chunk.content) {
          if (c.type === "output_text" || c.type === "text") {
            s.buffer += c.text;
            if (isVisible()) updateBotMessage(s, s.buffer);
          }
        }
      }

      if (chunk.isDone) {
        if (Array.isArray((chunk as any).sources) && (chunk as any).sources.length) {
          s.sources = Array.from(new Set([...s.sources, ...(chunk as any).sources]));
        }

        // Fold this turn's code interpreter call(s) — code, final status,
        // generated files — into the persisted assistant message before
        // activeTools gets wiped by resetSessionStream() below. Without
        // this, the card (and any chart image) the user just watched
        // stream in would vanish the instant the reply finishes, only to
        // reappear after a full page reload once it's read back from the DB.
        const codeInterpreterParts: ContentPart[] = Object.values(s.activeTools)
          .filter((t) => t.source === "code_interpreter")
          .map((t) => ({
            type: "code_interpreter",
            code: t.code ?? "",
            status: t.status ?? "completed",
            files: t.files ?? [],
          } as unknown as ContentPart));

        if (isVisible() && (s.botMessageAdded || codeInterpreterParts.length)) {
          updateBotMessage(s, s.buffer, codeInterpreterParts);
        }
        resetSessionStream(sessionIdForStream);
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removePastedText = (i: number) => setPastedTexts((p) => p.filter((_, idx) => idx !== i));

  const cancelStream = async () => {
    if (!activeSessionId) return;

    await api.abortChat();
    resetSessionStream(activeSessionId);
  };

  return (
    <div className={`chat_plane ${className}`}>
      {showTopBar && (
        <div className="chat_topbar">
          <span className="chat_topbar__brand" title={title}>
            <OwlMark size={34} />
          </span>
        </div>
      )}

      <div className={chatMode ? "page" : "page_chatMode"} ref={pageRef}>
        <div className={`message_area ${cacheMessages.length > 2 ? "scrollable" : ""}`}>
          {cacheMessages.length === 0 && <div className="empty_state" />}

          {cacheMessages.map((msg: LLMMessage, i: number) => {
            const isLastUser =
              msg.role === "user" &&
              i === cacheMessages.findLastIndex((m: LLMMessage) => m.role === "user");
            if (!msg.content || !Array.isArray(msg.content)) return null;
            const parts = msg.content;

            if (msg.role === "user") {
              const hasRenderablePart = parts.some(
                (m) => m.type === "text" || m.type === "input_url_image" || m.type === "input_file"
              );
              if (!hasRenderablePart) return null;

              return (
                <div key={i} ref={isLastUser ? lastUserMsgRef : undefined} className="message user_message">
                  {parts.map((m, j) => {
                    if (m.type === "input_url_image") {
                      const img = m as ImageUrlContent;
                      if (!img.image_url?.url) return null;
                      return (
                        <img
                          key={`${i}-${j}`}
                          src={img.image_url.url}
                          alt="Attached image"
                          className="user_message_image"
                        />
                      );
                    }
                    if (m.type === "input_file") {
                      const f = m as FileInput;
                      return (
                        <a
                          key={`${i}-${j}`}
                          className="user_message_file"
                          href={f.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <span className="user_message_file_icon">
                            {(f.fileExtension ?? "FILE").slice(0, 4).toUpperCase()}
                          </span>
                          <span className="user_message_file_name">{f.fileName ?? "Attached file"}</span>
                        </a>
                      );
                    }
                    if (m.type === "text") {
                      return (
                        <span key={`${i}-${j}`} className="user_message_text">
                          {(m as TextContent).text}
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>
              );
            } else if (msg.role === "assistant") {
              const liveSources = (msg as any).sources as string[] | undefined;
              const msgSources = liveSources && liveSources.length
                ? liveSources
                : getSourcesForAssistantMessage(cacheMessages, i);
              return (
                <div key={i} className="assistant_turn">
                  {parts.map((m, j) => {
                    if (m.type === "output_text" || m.type === "text") {
                      return <BotMessage key={`${i}-${j}`} text={(m as TextContent).text} />;
                    }
                    if (m.type === "code_interpreter") {
                      const ci = m as CodeInterpreterContent;
                      return (
                        <CodeInterpreterCard
                          key={`${i}-${j}`}
                          code={ci.code}
                          status={ci.status}
                          done
                          files={ci.files ?? []}
                        />
                      );
                    }
                    return null;
                  })}
                  {msgSources && msgSources.length > 0 && (
                    <div className="message_sources">
                      <span className="sources_label">Sources:</span>
                      {msgSources.map((f, k) => (
                        <span key={k} className="source_pill">{f}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            }
          })}

          {streamError && (
            <div className="message error_message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10" stroke="#C0392B" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="#C0392B" strokeWidth="2"
                  strokeLinecap="round" />
              </svg>
              <span>{streamError}</span>
            </div>
          )}
          {isStreaming && sessionStreamsRef.current[activeSessionId ?? ""]?.buffer === "" && Object.keys(activeTools).length === 0 && (
            <div className="thinking-bubble">
              <ThinkingOwl />
            </div>
          )}

          {Object.entries(activeTools).map(([callId, tool]) =>
            tool.source === "code_interpreter" ? (
              <CodeInterpreterCard
                key={callId}
                code={tool.code ?? ""}
                status={tool.status}
                done={tool.done}
                files={tool.files ?? []}
              />
            ) : (
              <ToolCallCard
                key={callId}
                name={tool.name}
                args={tool.args}
                result={tool.result}
                done={tool.done}
                source={tool.source}
                serverLabel={tool.serverLabel}
              />
            )
          )}

          {mcpStatus && <div className="mcp_status">{mcpStatus}</div>}
          <div ref={bottomAnchorRef} />
        </div>
      </div>

      <div className={`chat_input_wrapper ${!chatMode ? "centered" : ""}`}>
        {!chatMode && <div className="chat_welcom_message">{welcomeMessage}</div>}
        <div className="chat_input">
          {files.length > 0 && (
            <div className="attachment_pills">
              {files.map((f, i) => (
                <FileComponent
                  key={`file-${i}-${f.name}`}
                  file={f}
                  upload={true}
                  index={i}
                  fileIdAccumulator={fileAccumulator}
                  removeFile={() => removeFile(i)}
                />
              ))}
            </div>
          )}

          {pastedTexts.length > 0 && (
            <div className="attachment_pills">
              {pastedTexts.map((pt, i) => (
                <div className="pasted_content" key={`pasted-${i}-${pt.name}`}>
                  <div className="pasted_content_icon txt">TXT</div>
                  <div className="pasted_content_meta">
                    <span className="pasted_content_text" title={pt.content}>{pt.name}</span>
                    <span className="pasted_content_type">{pt.content.length.toLocaleString()} chars</span>
                  </div>
                  <button
                    type="button"
                    className="pasted_content_remove"
                    aria-label={`Remove ${pt.name}`}
                    onClick={() => removePastedText(i)}
                  >
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isStreaming}
          />

          <div className="chat_input_bottom">
            <div className="chat_input_bottom__dropdown_options">
              <label style={{ cursor: "pointer" }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
                <input
                  type="file"
                  style={{ display: "none" }}
                  accept="image/*,.docx,.pdf,.txt,.csv,.json"
                  multiple
                  onChange={handleFileSelect}
                />
              </label>
            </div>

            <div className="chat_input_bottom__functional_options">
              {isStreaming ? (
                <button className="stop_btn" onClick={cancelStream}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="5" width="14" height="14" rx="2" fill="white" />
                  </svg>
                </button>
              ) : (
                <button className="send_btn" onClick={handleSend}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M12 19V5M5 12l7-7 7 7" stroke="white" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};