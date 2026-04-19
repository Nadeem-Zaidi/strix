// hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";

type Message = { role: "user" | "bot"; text: string; cancelled?: boolean };
type LLMMessage = { role: "user" | "assistant"; content: string };

export const useWebSocket = (url: string) => {
    const ws = useRef<WebSocket | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);

    const history = useRef<LLMMessage[]>([]);
    const rpcId = useRef(1);
    const currentRequestId = useRef<number | null>(null); // track active request
    const streamBuffer = useRef("");

    useEffect(() => {
        ws.current = new WebSocket(url);
        ws.current.onopen = () => setIsConnected(true);

        ws.current.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const result = data.result;
            if (!result) return;

            if (result.type === "chunk" && result.content) {
                streamBuffer.current += result.content;
                setMessages(prev => {
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last?.role === "bot") {
                        updated[updated.length - 1] = { ...last, text: streamBuffer.current };
                    } else {
                        updated.push({ role: "bot", text: streamBuffer.current });
                    }
                    return updated;
                });
            } else if (result.type === "done") {          // ← else if, not if
                const finalText = streamBuffer.current;   // ← capture BEFORE clearing
                if (finalText) {
                    history.current.push({ role: "assistant", content: finalText });
                }
                streamBuffer.current = "";
                currentRequestId.current = null;
                setIsStreaming(false);
            } else if (result.type === "cancelled") {     // ← else if, not if
                const finalText = streamBuffer.current;
                if (finalText) {
                    history.current.push({ role: "assistant", content: finalText });
                    setMessages(prev => {
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
            }
        };
        ws.current.onclose = () => setIsConnected(false);
        ws.current.onerror = (err) => console.error("WS error:", err);
        return () => ws.current?.close();
    }, [url]);

    const sendMessage = useCallback((text: string) => {
        if (ws.current?.readyState !== WebSocket.OPEN) return;

        const requestId = rpcId.current++;
        currentRequestId.current = requestId;

        setMessages(prev => [...prev, { role: "user", text }]);
        setIsStreaming(true);
        streamBuffer.current = "";

        history.current.push({ role: "user", content: text });

        ws.current.send(JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            method: "llm.stream",
            params: {
                requestId,          // ← send requestId so server can match cancel
                messages: history.current
            }
        }));
    }, []);

    const cancelStream = useCallback(() => {
        if (!currentRequestId.current || ws.current?.readyState !== WebSocket.OPEN) return;

        ws.current.send(JSON.stringify({
            jsonrpc: "2.0",
            id: rpcId.current++,
            method: "llm.cancel",
            params: { requestId: currentRequestId.current }
        }));
    }, []);

    return { messages, isConnected, isStreaming, sendMessage, cancelStream };
};