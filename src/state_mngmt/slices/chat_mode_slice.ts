import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

interface ChatMode {
    chatMode: boolean
}

const initialState: ChatMode = {
    chatMode: sessionStorage.getItem("chat_mode") === "true"
}

export const chatModeSlice = createSlice({
    name: 'chatMode',
    initialState,
    reducers: {
        changeChatMode: (state, action: PayloadAction<boolean>) => {
            state.chatMode = action.payload
            sessionStorage.setItem("chat_mode", String(action.payload))
        }
    }
})

export const { changeChatMode } = chatModeSlice.actions
export default chatModeSlice.reducer