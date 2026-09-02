import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import { api } from "../../helper/api"
import type { ContentPart, LLMMessage, Session } from "../../types"



export const newSession = createAsyncThunk<{ windowId: string; session: Session },{ windowId: string },{ rejectValue: string }
>("session/new", async ({ windowId }, { rejectWithValue }) => {
    try {
        const session = await api.newSession();
        return { windowId, session };
    } catch (err: any) {
        return rejectWithValue(err.message ?? "error in creating new session");
    }
});

// Global — one shared session list across all windows (e.g. for a history sidebar)
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

// Global — deletes a session everywhere; any window pointing at it gets cleared below
export const deleteSession = createAsyncThunk<string, string, { rejectValue: string }>(
    "session/delete",
    async (sessionId, { rejectWithValue }) => {
        try {
            await api.deleteSession(sessionId); // don't rely on its return value
            return sessionId;                   // return what you know you deleted
        } catch (err: any) {
            return rejectWithValue(err.message ?? "error in deleting history");
        }
    }
);

export const loadMessages = createAsyncThunk<
    { windowId: string; messages: Array<Record<string, any>> },
    { windowId: string; sessionId: string },
    { rejectValue: string }
>("session/loadMessages", async ({ windowId, sessionId }, { rejectWithValue }) => {
    try {
        const messages = await api.getMessages(sessionId);
        return { windowId, messages };
    } catch (err: any) {
        return rejectWithValue(err.message ?? "error in loading messages");
    }
});

export const switchSession = createAsyncThunk<
    { windowId: string; session: Session },
    { windowId: string; sessionId: string },
    { rejectValue: string }
>("session/switch", async ({ windowId, sessionId }, { rejectWithValue }) => {
    try {
        const session = await api.getSession(sessionId);
        return { windowId, session };
    } catch (err: any) {
        return rejectWithValue(err.message ?? "error in loading session");
    }
});

// Reads/creates a session for a given window, persisted per-window in sessionStorage
// so a page refresh can restore each chat box to the session it was on.
export const loadOrCreateSession = createAsyncThunk<
    { windowId: string; session: Session },
    { windowId: string; name: string },
    { rejectValue: string }
>("session/loadOrCreate", async ({ windowId, name }, { dispatch, rejectWithValue }) => {
    try {
        const raw = sessionStorage.getItem("sessions");
        const stored = raw ? JSON.parse(raw) : {};

        if (stored[name]) {
            return { windowId, session: stored[name].session as Session };
        }

        const result = await dispatch(newSession({ windowId }));
        if (newSession.rejected.match(result)) {
            return rejectWithValue(result.payload ?? "error creating session");
        }

        const created = result.payload.session;
        stored[name] = { id: created.id, session: created, messages: [], chatMode: false };
        sessionStorage.setItem("sessions", JSON.stringify(stored));
        return { windowId, session: created };
    } catch (err: any) {
        return rejectWithValue(err.message ?? "error loading session");
    }
});

const readChatMode = (windowId: string): boolean => {
    try {
        return sessionStorage.getItem(`chat_mode_${windowId}`) !== null;
    } catch {
        return false;
    }
};

const readActiveSessionId = (windowId: string): string | null => {
    try {
        return sessionStorage.getItem(`active_session_id_${windowId}`);
    } catch {
        return null;
    }
};

interface ChatWindowState {
    activeSessionId: string | null;
    chatMode: boolean;
    chatMessages: LLMMessage[];
    cacheChatMessages: LLMMessage[];
    status: "idle" | "loading" | "error";
}

interface SessionState {
    sessions: Session[]; // shared across all windows
    status: "idle" | "loading" | "error"; // status of the shared sessions list
    windows: Record<string, ChatWindowState>;
}

const emptyWindow = (windowId: string): ChatWindowState => ({
    activeSessionId: readActiveSessionId(windowId),
    chatMode: readChatMode(windowId),
    chatMessages: [],
    cacheChatMessages: [],
    status: "idle",
});

const initialState: SessionState = {
    sessions: [],
    status: "idle",
    windows: {},
};

// Safety net: if a component dispatches into a window before calling
// openWindow (e.g. mount-order race), create it on the fly instead of
// crashing on `state.windows[windowId].foo`.
const ensureWindow = (state: SessionState, windowId: string): ChatWindowState => {
    if (!state.windows[windowId]) {
        state.windows[windowId] = emptyWindow(windowId);
    }
    return state.windows[windowId];
};

const sessionSlice = createSlice({
    name: "session",
    initialState,
    reducers: {
        openWindow(state, action: PayloadAction<{ windowId: string }>) {
            if (!state.windows[action.payload.windowId]) {
                state.windows[action.payload.windowId] = emptyWindow(action.payload.windowId);
            }
        }, 
        closeWindow(state, action: PayloadAction<{ windowId: string }>) {
            delete state.windows[action.payload.windowId];
        },
        setActiveSession(state, action: PayloadAction<{ windowId: string; sessionId: string | null }>) {
            const { windowId, sessionId } = action.payload;
            const win = ensureWindow(state, windowId);
            win.activeSessionId = sessionId;
            if (sessionId) {
                sessionStorage.setItem(`active_session_id_${windowId}`, sessionId);
            } else {
                sessionStorage.removeItem(`active_session_id_${windowId}`);
            }
        },
        setChatMode(state, action: PayloadAction<{ windowId: string; chatMode: boolean }>) {
            const { windowId, chatMode } = action.payload;
            const win = ensureWindow(state, windowId);
            win.chatMode = chatMode;
            if (chatMode) {
                sessionStorage.setItem(`chat_mode_${windowId}`, "1");
            } else {
                sessionStorage.removeItem(`chat_mode_${windowId}`);
            }
        },
        updateSessionTitle(state, action: PayloadAction<{ sessionId: string; title: string }>) {
            const session = state.sessions.find(s => s.id === action.payload.sessionId);
            if (session) {
                session.title = action.payload.title;
            }
        },
        appendMessage(state, action: PayloadAction<{ windowId: string; message: LLMMessage }>) {
            const { windowId, message } = action.payload;
            const win = ensureWindow(state, windowId);
            if (!win.activeSessionId) win.chatMessages = [];
            win.chatMessages = [...win.chatMessages, message];
        },
        appendCacheMessage(state, action: PayloadAction<{ windowId: string; messages: LLMMessage[] }>) {
            const { windowId, messages } = action.payload;
            const win = ensureWindow(state, windowId);
            win.cacheChatMessages = [...win.cacheChatMessages, ...messages];
        },
        clearCacheMessage(state, action: PayloadAction<{ windowId: string }>) {
            ensureWindow(state, action.payload.windowId).cacheChatMessages = [];
        },
        replaceLastMessage(state, action: PayloadAction<{ windowId: string; message: LLMMessage }>) {
            const { windowId, message } = action.payload;
            const win = ensureWindow(state, windowId);
            if (win.cacheChatMessages.length === 0) return;
            win.cacheChatMessages[win.cacheChatMessages.length - 1] = message;
        },
        setCacheMessages(state, action: PayloadAction<{ windowId: string; messages: LLMMessage[] }>) {
            const { windowId, messages } = action.payload;
            ensureWindow(state, windowId).cacheChatMessages = messages;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(newSession.fulfilled, (state, action) => {
                const { windowId, session } = action.payload;
                const win = ensureWindow(state, windowId);
                win.activeSessionId = session.id;
                sessionStorage.setItem(`active_session_id_${windowId}`, session.id);
            })
            .addCase(switchSession.fulfilled, (state, action) => {
                const { windowId, session } = action.payload;
                const win = ensureWindow(state, windowId);
                win.activeSessionId = session.id;
                sessionStorage.setItem(`active_session_id_${windowId}`, session.id);
            })
            .addCase(loadOrCreateSession.fulfilled, (state, action) => {
                const { windowId, session } = action.payload;
                const win = ensureWindow(state, windowId);
                win.activeSessionId = session.id;
                sessionStorage.setItem(`active_session_id_${windowId}`, session.id);
                if (!state.sessions.some(s => s.id === session.id)) {
                    state.sessions.push(session);
                }
            })
            .addCase(deleteSession.fulfilled, (state, action) => {
                const deletedId = action.payload;
                state.sessions = state.sessions.filter(s => s.id !== deletedId);
                // clear it out of every window that had it active, not just one
                for (const windowId of Object.keys(state.windows)) {
                    const win = state.windows[windowId];
                    if (win.activeSessionId === deletedId) {
                        win.activeSessionId = state.sessions[0] ? state.sessions[0].id : null;
                        win.chatMessages = [];
                        win.cacheChatMessages = [];
                    }
                }
            })
            .addCase(loadMessages.fulfilled, (state, action) => {
                const { windowId, messages } = action.payload;
                const win = ensureWindow(state, windowId);
                if (!win.activeSessionId) return;

                const storedMessages: LLMMessage[] = messages.map((message) => {
                    switch (message.role) {
                        case "user":
                            return { role: "user", content: message.content as ContentPart[] } as LLMMessage;
                        case "assistant":
                            return { role: "assistant", content: message.content as ContentPart[] } as LLMMessage;
                        case "tool_call":
                            return {
                                role: "tool_call",
                                name: message.name,
                                arguments: message.arguments ? message.arguments : {},
                                tool_call_id: message.tool_call_id,
                            } as LLMMessage;
                        case "tool_call_output":
                            return {
                                role: "tool",
                                tool_call_id: message.tool_call_id,
                                output: message.output ?? "",
                            } as LLMMessage;
                        default:
                            throw new Error(`Unsupported content type: ${message.role}`);
                    }
                });

                win.chatMessages = storedMessages;
                win.cacheChatMessages = storedMessages;
            })
            .addCase(loadSessions.pending, (state) => { state.status = "loading"; })
            .addCase(loadSessions.rejected, (state) => { state.status = "error"; })
            .addCase(loadSessions.fulfilled, (state, action) => {
                state.sessions = action.payload;
                state.status = "idle";
            });
    },
});

export const {
    openWindow,
    closeWindow,
    setActiveSession,
    setChatMode,
    appendMessage,
    appendCacheMessage,
    clearCacheMessage,
    replaceLastMessage,
    setCacheMessages,
    updateSessionTitle,
} = sessionSlice.actions;

export default sessionSlice.reducer;