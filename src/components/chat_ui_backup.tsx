import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "../global/chat.css";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type Message = {
    role: "user" | "bot";
    text: string;
    cancelled?: boolean;
};

type LLMMessage = {
    role: "user" | "assistant";
    content: string;
};

// ─────────────────────────────────────────────────────────
// BotMessage component with markdown
// ─────────────────────────────────────────────────────────

type BotMessageProps = {
    text: string;
    isStreaming?: boolean;
    cancelled?: boolean;
};

const BotMessage = ({ text, isStreaming, cancelled }: BotMessageProps) => {
    return (
        <div className="message bot_message">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    code({ className, children, ...props }) {
                        const isBlock = className?.includes("language-");
                        const [copied, setCopied] = useState(false);

                        const handleCopy = () => {
                            navigator.clipboard.writeText(
                                String(children).replace(/\n$/, "")
                            );
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        };

                        return isBlock ? (
                            <div className="code_block_wrapper">
                                <div className="code_header">
                                    <span className="code_lang">
                                        {className?.replace("language-", "") ??
                                            "code"}
                                    </span>
                                    <button
                                        className="copy_btn"
                                        onClick={handleCopy}
                                    >
                                        {copied ? "✅ Copied" : "Copy"}
                                    </button>
                                </div>
                                <pre>
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                </pre>
                            </div>
                        ) : (
                            <code className="inline_code" {...props}>
                                {children}
                            </code>
                        );
                    },
                    a({ children, href }) {
                        return (
                            <a href={href} target="_blank" rel="noreferrer">
                                {children}
                            </a>
                        );
                    },
                }}
            >
                {text}
            </ReactMarkdown>

            {isStreaming && <span className="cursor">▋</span>}
            {cancelled && (
                <span className="cancelled_label">⚠ Response stopped</span>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────
// useWebSocket hook
// ─────────────────────────────────────────────────────────

const useWebSocket = (url: string) => {
    const ws = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);

    const history = useRef<LLMMessage[]>([]);
    const rpcId = useRef(1);
    const currentRequestId = useRef<number | null>(null);
    const streamBuffer = useRef("");

    const finishStream = useCallback((cancelled = false) => {
        if (streamBuffer.current) {
            history.current.push({
                role: "assistant",
                content: streamBuffer.current,
            });
        }
        if (cancelled) {
            setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.role === "bot") {
                    updated[updated.length - 1] = { ...last, cancelled: true };
                }
                return updated;
            });
        }
        streamBuffer.current = "";
        currentRequestId.current = null;
        setIsStreaming(false);
    }, []);

    useEffect(() => {
        ws.current = new WebSocket(url);

        ws.current.onopen = () => setIsConnected(true);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const result = data.result;
            if (!result) return;

            if (result.type === "chunk" && result.content) {
                streamBuffer.current += result.content;
                setMessages((prev) => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "bot") {
                        updated[updated.length - 1] = {
                            ...last,
                            text: streamBuffer.current,
                        };
                    } else {
                        updated.push({
                            role: "bot",
                            text: streamBuffer.current,
                        });
                    }
                    return updated;
                });
            }

            if (result.type === "done") {
                finishStream(false);
            }

            if (result.type === "cancelled") {
                finishStream(true);
            }
        };

        ws.current.onclose = () => setIsConnected(false);
        ws.current.onerror = (err) => console.error("WS error:", err);

        return () => ws.current?.close();
    }, [url, finishStream]);

    const sendMessage = useCallback(
        (text: string) => {
            if (ws.current?.readyState !== WebSocket.OPEN) return;

            const requestId = rpcId.current++;
            currentRequestId.current = requestId;

            setMessages((prev) => [...prev, { role: "user", text }]);
            setIsStreaming(true);
            streamBuffer.current = "";

            history.current.push({ role: "user", content: text });

            ws.current.send(
                JSON.stringify({
                    jsonrpc: "2.0",
                    id: requestId,
                    method: "llm.stream",
                    params: {
                        requestId,
                        messages: history.current,
                    },
                })
            );

            setTimeout(() => {
                if (currentRequestId.current === requestId) {
                    finishStream(false);
                }
            }, 60000);
        },
        [finishStream]
    );

    const cancelStream = useCallback(() => {
        if (
            !currentRequestId.current ||
            ws.current?.readyState !== WebSocket.OPEN
        )
            return;

        ws.current.send(
            JSON.stringify({
                jsonrpc: "2.0",
                id: rpcId.current++,
                method: "llm.cancel",
                params: { requestId: currentRequestId.current },
            })
        );
    }, []);

    return { messages, isConnected, isStreaming, sendMessage, cancelStream };
};


export const ChatUiB = () => {
    const { messages, isConnected, isStreaming, sendMessage, cancelStream } =
        useWebSocket("ws://localhost:3000");

    const [input, setInput] = useState("");
    const lastUserMsgRef = useRef<HTMLDivElement>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const hasScrolledToUser = useRef(false);

    // scroll so the latest user message sits near the top
    useEffect(() => {
        const lastMsg = messages[messages.length - 1];

        if (!lastMsg) return;

        // A new user message just appeared — scroll it to the top
        if (lastMsg.role === "user") {
            hasScrolledToUser.current = false;
        }

        if (lastMsg.role === "user" && lastUserMsgRef.current) {
            lastUserMsgRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
            hasScrolledToUser.current = true;
            return;
        }

        // Bot is streaming — follow the bottom
        if (lastMsg.role === "bot" && bottomRef.current) {
            bottomRef.current.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || !isConnected || isStreaming) return;
        sendMessage(input);
        setInput("");
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="chat_main">
            {/* ── Topbar ── */}
            <div className="chat_topbar">
                <h4>Owl Bot {isConnected ? "🟢" : "🔴"}</h4>
            </div>

            <div className="chat_sections">
                {/* ── Sidebar ── */}
                <div className="chat_sidebar">
                    <h4>Chats</h4>
                </div>

                {/* ── Main chat plane ── */}
                <div className="chat_plane">
                    <div className="page">
                        <div className="message_area">
                            {messages.map((msg, i) => {
                                const isLastUser =
                                    msg.role === "user" &&
                                    i === messages.findLastIndex((m) => m.role === "user");

                                return msg.role === "user" ? (
                                    <div
                                        key={i}
                                        ref={isLastUser ? lastUserMsgRef : undefined}
                                        className="message user_message"
                                    >
                                        {msg.text}
                                    </div>
                                ) : (
                                    <BotMessage
                                        key={i}
                                        text={msg.text}
                                        cancelled={msg.cancelled}
                                        isStreaming={isStreaming && i === messages.length - 1}
                                    />
                                );
                            })}

                            {messages.length === 0 && (
                                <div className="empty_state">
                                    <p>Ask me anything 👋</p>
                                </div>
                            )}

                            <div ref={bottomRef} />
                            <div className="message_bottom_spacer" />
                        </div>
                    </div>

                    {/* floating input bar */}
                    <div className="chat_input_wrapper">
                        <div className="chat_input">
                            <input
                                type="text"
                                placeholder={
                                    isStreaming
                                        ? "Responding..."
                                        : "Ask anything..."
                                }
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={isStreaming}
                            />

                            {isStreaming ? (
                                <button
                                    className="stop_btn"
                                    onClick={cancelStream}
                                >
                                    ⏹ Stop
                                </button>
                            ) : (
                                <button
                                    className="send_btn"
                                    onClick={handleSend}
                                    disabled={!isConnected || !input.trim()}
                                >
                                    Send
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};