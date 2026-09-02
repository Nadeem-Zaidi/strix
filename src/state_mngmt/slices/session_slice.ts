import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { api } from "../../helper/api"
import type { ContentPart, LLMMessage, Session } from "../../types";


export const newSession = createAsyncThunk<Session, void, { rejectValue: string }>("session/new", async (_, { rejectWithValue }) => {
    try {
        const sessionId = await api.newSession();
        return sessionId
    } catch (err: any) {
        return rejectWithValue(err.message ?? "error in creating new session")
    }

});
export const loadSessions = createAsyncThunk<Session[], void, { rejectValue: string }>(
    "session/loadAll",
    async (_, { rejectWithValue }) => {
        try {
            const sessions = await api.getSessions();
            return sessions;
        } catch (err: any) {
            return rejectWithValue(err.message ?? "error in loading history");
        }
    }
);
export const deleteSession = createAsyncThunk<any, string, { rejectValue: string }>(
    "session/delete",
    async (sessionId: string, { rejectWithValue }) => {
        try {
            const deletedSessionId = await api.deleteSession(sessionId);
            return deletedSessionId;

        } catch (err: any) {
            return rejectWithValue(err.message ?? "error in deleting history");

        }


    })
export const loadMessages = createAsyncThunk<LLMMessage[], string, { rejectValue: string }>(
    "session/loadMessages",
    async (sessionId: string, { rejectWithValue }) => {

        try {
            const messages: LLMMessage[] = await api.getMessages(sessionId)
            return messages;

        } catch (err: any) {
            return rejectWithValue(err.message ?? "error in loading messages");

        }

    })

export const switchSession = createAsyncThunk<Session, string, { rejectValue: string }>(
    "session/switch",
    async (id: string, { rejectWithValue }) => {
        try {
            const sessionId = await api.getSession(id)
            return sessionId;

        } catch (err: any) {
            return rejectWithValue(err.message ?? "error in loading session");

        }


    })
// export const addMessage = createAsyncThunk(
//     "session/addMessage",
//     ({ sessionId, message }: { sessionId: string; message: LLMMessage }) =>
//         window.electronAPI.addMessage(sessionId, message)
// )

const readChatMode = () => {
    try {
        const raw = sessionStorage.getItem("chat_mode")
        if (!raw) {
            return false
        }
        return true

    } catch (err: any) {
        return false

    }
}

const readActiveSessionId = () => {
    try {
        const raw = sessionStorage.getItem("active_session_id")
        if (!raw) {
            return null
        }
        return raw

    } catch (err: any) {
        return null

    }
}

interface SessionState {
    sessions: Session[]
    chatMode?: boolean
    sessionIds: string[]
    activeSessionId: string | null
    chatMessages: LLMMessage[]
    cacheChatMessages: LLMMessage[]
    status: "idle" | "loading" | "error"
}

const initialState: SessionState = {
    sessions: [],
    sessionIds:[],
    chatMode: readChatMode(),
    activeSessionId: readActiveSessionId(),
    chatMessages: [],
    cacheChatMessages: [],
    status: "idle"
}

const sessionSlice = createSlice({
    name: "session",
    initialState,
    reducers: {
        setActiveSession(state, action) {
            state.activeSessionId = action.payload
            if (action.payload === null) {
                sessionStorage.removeItem("active_session_id")
            } else {
                state.sessionIds.push(action.payload);
                sessionStorage.setItem("active_session_id", JSON.stringify(state.sessionIds));
                
                state.chatMode = true;
                sessionStorage.setItem("chat_mode", "true")

            }

        },
        setChatMode(state, action) {
            state.chatMode = action.payload
            sessionStorage.setItem("chat_mode", String(action.payload))
        },
        updateSessionTitle(state, action: PayloadAction<{ sessionId: string; title: string }>) {
            const session = state.sessions.find(
                s => s.id === action.payload.sessionId
            );

            if (session) {
                session.title = action.payload.title;
            }
        },
        appendMessage(state, action: PayloadAction<LLMMessage>) {
            if (!state.activeSessionId) state.chatMessages = []
            state.chatMessages = [...state.chatMessages, action.payload]
        },

        appendCacheMessage(state, action: PayloadAction<LLMMessage[]>) {
            state.cacheChatMessages = [...state.cacheChatMessages, ...action.payload];
        },

        clearCacheMessage(state) {
            state.cacheChatMessages = [];

        },
        replaceLastMessage(state, action: PayloadAction<LLMMessage>) {
            if (state.cacheChatMessages.length === 0) return;
            state.cacheChatMessages[state.cacheChatMessages.length - 1] = action.payload;
        },
        setCacheMessages(state, action: PayloadAction<LLMMessage[]>) {
            state.cacheChatMessages = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder

            .addCase(newSession.fulfilled, (state, action) => {
                state.activeSessionId = action.payload.id
                sessionStorage.setItem("active_session_id", action.payload.id)
            })

            .addCase(switchSession.fulfilled, (state, action) => {
                state.activeSessionId = action.payload.id
                sessionStorage.setItem("active_session_id", action.payload.id)
            })
            .addCase(deleteSession.fulfilled, (state, action) => {
                state.sessions = state.sessions.filter(s => s.id !== action.payload)
                if (state.activeSessionId === action.payload) {
                    state.activeSessionId = state.sessions[0]
                        ? state.sessions[0].id
                        : null
                }
            })

            .addCase(loadMessages.fulfilled, (state, action: PayloadAction<Array<Record<string, any>>>) => {
                if (state.activeSessionId) {
                    console.log(action.payload)
                    const storedMessages: LLMMessage[] | [] = action.payload.map((message) => {
                        switch (message.role) {
                            case "user":
                                return {
                                    role: "user",
                                    content: message.content as ContentPart[]
                                } as LLMMessage
                            case "assistant":
                                return {
                                    role: "assistant",
                                    content: message.content as ContentPart[]
                                } as LLMMessage
                            case "tool_call":
                                return {
                                    role: "tool_call",
                                    name: message.name,
                                    arguments: message.arguments
                                        ? message.arguments  // parse if stored as JSON string
                                        : {},
                                    tool_call_id: message.tool_call_id
                                } as LLMMessage

                            case "tool_call_output":
                                return {
                                    role: "tool",
                                    tool_call_id: message.tool_call_id,
                                    output: message.output ?? ""  // guard against null
                                } as LLMMessage
                            default:
                                throw new Error(
                                    `Unsupported content type:`
                                );
                        }
                    })
                    state.chatMessages = [...storedMessages]
                    state.cacheChatMessages = [...storedMessages];
                }
            })

            .addCase(loadSessions.pending, (state) => { state.status = "loading" })
            .addCase(loadSessions.rejected, (state) => { state.status = "error" })
            .addCase(loadSessions.fulfilled, (state, action) => {
                state.sessions = action.payload
            })
    }
})

export const { setActiveSession, appendMessage, appendCacheMessage, clearCacheMessage, replaceLastMessage, setCacheMessages, updateSessionTitle, setChatMode } = sessionSlice.actions
export default sessionSlice.reducer