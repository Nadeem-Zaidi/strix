import type { LLMMessage, Session } from "../types";
import { BaseApi } from "./base_fetch";

export type StreamChunk = {
    type:
        | "message"
        | "function_call"
        | "function_call_arguments" // matches the backend's actual event name
        | "function_call_output"
        | "mcp_call"                // remote MCP tool call started
        | "mcp_call_arguments"      // remote MCP tool call arguments finalized
        | "mcp_call_output"         // remote MCP tool call completed
        | "mcp_list_tools"          // MCP server exposed its available tools
        | "mcp_approval_request"    // MCP server requires human approval before running
        | "session_title"
        | "error"
        | "cancelled"               // stream aborted via AbortController
        | "done"
        | string;
    tool_call_id?: string;
    name?: string;
    args?: string;              // used by function_call_arguments AND mcp_call_arguments (aligned naming)
    output?: string;
    title?: string;
    code?: string;
    message?: string;
    content?: { type: string; text: string }[];
    isDone?: boolean;
    server_label?: string;      // which MCP server this event relates to (mcp_call, mcp_call_arguments, mcp_list_tools, mcp_approval_request)
    tools?: { name: string; description?: string }[]; // tool list from mcp_list_tools
};

class Api extends BaseApi {
    private abortController: AbortController | null = null;

    constructor() {
        super(import.meta.env.VITE_API_URL);
    }

    async getSessions() {
        return await this.get<Session[]>(`/load_sessions`);
    }

    async getSession(sessionId: string): Promise<Session> {
        return await this.get<Session>(`/get_session/${sessionId}`); // path param, not query
    }

    async deleteSession(sessionId: string) {
        await this.delete(`/delete/${sessionId}`); // path param, matches backend exactly
    }

    async getMessages(sessionId: string) {
        return await this.get<LLMMessage[]>(`/load_messages/${sessionId}`); // path param, not query
    }

    async newSession():Promise<Session> {
        return await this.post<Session>("/new_session");
    }

    async sendMessage(
        sessionId: string,
        message: LLMMessage,
        onChunk: (chunk: StreamChunk) => void
    ) {
        this.abortController = new AbortController();

        try {
            await this.stream(
                "/chat_stream",
                { currentSessionId: sessionId, llmMessage: message }, // field names matched to backend body destructuring
                (_event, data) => onChunk(data as StreamChunk),
                this.abortController.signal
            );
            if (!this.abortController?.signal.aborted) {
                onChunk({ type: "done", isDone: true });
            }
        } catch (err) {
            if (!this.abortController?.signal.aborted) {
                onChunk({
                    type: "error",
                    code: "stream_error",
                    message: err instanceof Error ? err.message : "Unknown streaming error",
                });
            }
        } finally {
            this.abortController = null;
        }
    }

    async abortChat() {
        this.abortController?.abort();
        this.abortController = null;
    }

    protected async stream(
        path: string,
        body: unknown,
        onEvent: (event: string, data: unknown) => void,
        signal?: AbortSignal
    ) {
        const url = `${this.baseUrl}${path}`;
        const headers = await this.getHeader();
        const response = await fetch(url, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
            signal,
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }
        if (!response.body) {
            throw new Error("Response body is empty.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";

            for (const eventBlock of events) {
                const lines = eventBlock.split("\n");
                let event = "message";
                const dataLines: string[] = [];

                for (const line of lines) {
                    if (line.startsWith("event:")) {
                        event = line.slice(6).trim();
                    } else if (line.startsWith("data:")) {
                        dataLines.push(line.slice(5).trim());
                    }
                }

                if (dataLines.length === 0) continue;
                const data = dataLines.join("\n");

                try {
                    onEvent(event, JSON.parse(data));
                } catch {
                    onEvent(event, data);
                }
            }
        }
    }
}

export const api = new Api();