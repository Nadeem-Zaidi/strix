import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"
import type { Message, Session } from "../../types"
import { api } from "../../helper/helper_api_functions"

interface SessionState {
    sessions: Session[]
    currentSessionId: string | null
    sessionmessages: Message[],
    sessionList: string[];
    loading: boolean
    error: string | null
}

const initialState: SessionState = {
    sessions: [],
    currentSessionId: sessionStorage.getItem("currentSessionId"),
    sessionmessages: [],
    sessionList: [],
    loading: false,
    error: null,
}

export const fetchSessions = createAsyncThunk(
    'session/fetchsessions',
    async () => {
        const result = await api.getSessions();
        return result;
    }
)

export const fetchMessages = createAsyncThunk(
    'session/fetchMessages',
    async (sessionId: string) => {
        const messages = await api.getMessages(sessionId);
        return { sessionId, messages }
    }
)

export const fetchSession = createAsyncThunk(
    'session/fetchSession',
    async (sessionId: string) => {
        const session = await api.getSession(sessionId);
        return session;
    }
)

const saveSessionId = (id: string | null) => {
    if (id) sessionStorage.setItem("currentSessionId", id);
    else sessionStorage.removeItem("currentSessionId");
}

export const sessionSlice = createSlice({
    name: 'sessionmessage',
    initialState,
    reducers: {
        setCurrentSession: (state, action: PayloadAction<string | null>) => {
            state.currentSessionId = action.payload
            saveSessionId(action.payload)
        },
        clearMessages: (state) => {
            state.sessionmessages = []
        },
        addSession: (state, action: PayloadAction<{ id: string; title: string, last_message: string | null, updated_at: string }>) => {
            // Only add if it doesn't already exist (e.g. user sent sessionId that was already loaded)
            const exists = state.sessions.some(s => s.id === action.payload.id);
            if (!exists) {
                state.sessions = [action.payload as Session, ...state.sessions];
            }
        },
        updateSessionTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
            const session = state.sessions.find(s => s.id === action.payload.id);
            if (session) {
                session.title = action.payload.title;
            }
        }
    },
    extraReducers: (builders) => {
        builders
            .addCase(fetchSessions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSessions.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                const serverSessions: Session[] = action.payload;

                // Preserve any locally added session not yet on server
                const serverIds = new Set(serverSessions.map(s => s.id));
                const localOnly = state.sessions.filter(s => !serverIds.has(s.id));

                state.sessions = [...localOnly, ...serverSessions];
            })
            .addCase(fetchSessions.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message || 'Failed to fetch sessions'
            })

        builders
            .addCase(fetchSession.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSession.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                state.currentSessionId = action.payload.id;
                saveSessionId(action.payload.id);
            })
            .addCase(fetchSession.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch session'
            })

        builders
            .addCase(fetchMessages.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                state.currentSessionId = action.payload.sessionId;
                saveSessionId(action.payload.sessionId);
                state.sessionmessages = action.payload.messages;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.loading = false
                state.error = action.error.message || 'Failed to fetch messages'
            })
    }
})

export const { setCurrentSession, addSession, clearMessages, updateSessionTitle } = sessionSlice.actions
export default sessionSlice.reducer