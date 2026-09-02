import { useCallback, useEffect, useRef, useState } from "react";
import type { LLMMessage } from "../types";
import { getAuthHeader } from "../helper/helper_api_functions";
import { useAppSelector, useAppDispatch } from "../state_mngmt/store";
import { addSession, fetchMessages, setCurrentSession, updateSessionTitle } from "../state_mngmt/slices/message_slice";

export const useChatStream = (endpoint: string) => {
  const [messages, setMessages] = useState<LLMMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { currentSessionId } = useAppSelector((state) => state.sessionState);
  const dispatch = useAppDispatch();

  const abortRef = useRef<AbortController | null>(null);
  const streamBuffer = useRef("");
  const botMessageAdded = useRef(false);


  const sendMessage = useCallback(
    async (llmMessage: LLMMessage) => {
      if (isStreaming) return;
      setMessages((prev) => [...prev, llmMessage]);

      setIsStreaming(true);
      streamBuffer.current = "";
      botMessageAdded.current = false;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const headers = await getAuthHeader();
        const res = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            llmMessage: llmMessage,
            sessionId: currentSessionId ?? "", // null on first message — backend creates one
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Server error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let partial = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          partial += decoder.decode(value, { stream: true });
          const frames = partial.split("\n\n");
          partial = frames.pop() ?? "";

          for (const frame of frames) {
            const trimmed = frame.trim();
            if (!trimmed) continue;
            let eventType = "message";
            let data = "";
            for (const line of trimmed.split("\n")) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                data = line.slice(5).trim();
              }
            }

            // ─── Handle by event type ─────────────────────────
            if (eventType === "session") {
              try {
                const sessionInfo = JSON.parse(data);
                // Update Redux with the canonical session from the server
                dispatch(setCurrentSession(sessionInfo.sessionId));
                dispatch(addSession({
                  id: sessionInfo.sessionId,
                  title: sessionInfo.title,
                  last_message: sessionInfo.last_message ?? "",
                  updated_at: sessionInfo.updated_at ?? ""

                }));
              } catch {
                console.error("Failed to parse session event");
              }
              continue;
            }
            if (eventType === "title") {
              try {
                const titleInfo = JSON.parse(data);
                dispatch(updateSessionTitle({
                  id: titleInfo.sessionId,
                  title: titleInfo.title,
                }));
              } catch {
                console.error("Failed to parse title event");
              }
              continue;
            }

            if (eventType === "function_call") {
              try {
                const toolInfo = JSON.parse(data);
                streamBuffer.current += `\n\n*🔧 Using tool: ${toolInfo.tool}...*\n\n`;
                updateBotMessage(streamBuffer.current);
              } catch {
                console.error("Failed to parse tool event");
              }
              continue;
            }

            if (eventType === "error") {
              try {
                const errorInfo = JSON.parse(data);
                console.error("Server error:", errorInfo.error);
              } catch {
                console.error("Stream error event");
              }
              continue;
            }

            // ─── Default: message data ────────────────────────
            if (data === "[DONE]") {
              setIsStreaming(false);
              abortRef.current = null;
              return;
            }

            try {
              const chunk = JSON.parse(data);
              if (typeof chunk === "string") {
                streamBuffer.current += chunk;
                updateBotMessage(streamBuffer.current);
              }
            } catch {
              /* malformed chunk — skip */
            }
          }
        }

        setIsStreaming(false);
      } catch (err: any) {
        if (err.name === "AbortError") {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = { ...last, cancelled: true };
            }
            return updated;
          });
        } else {
          console.error("Stream error:", err);
          setMessages((prev) => [
            ...prev.slice(0, botMessageAdded.current ? -1 : undefined),
            { role: "assistant", content: [{ type: "text", text: "Something went" }] } as LLMMessage
          ]);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [endpoint, isStreaming, currentSessionId, dispatch]
  );

  // ─── Helper: update or create the bot message ───────────────────
  function updateBotMessage(text: string) {
    if (!botMessageAdded.current) {
      botMessageAdded.current = true;
      setMessages((prev) => [...prev, { role: "assistant", content: [{ type: "text", text: text }] } as LLMMessage]);
    } else {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: [{ type: "text", text: text }] } as LLMMessage
        return updated;
      });
    }
  }

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isStreaming,
    sendMessage,
    cancelStream,
  };
};