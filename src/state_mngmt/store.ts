import { configureStore } from "@reduxjs/toolkit";
import chatModeReducer from "./slices/chat_mode_slice";
import sideBarReducer from "./slices/toggle_sidebar";
import authenticationReducer from "./slices/authentication_slice";
import fileExplorerReducer from "./slices/file_explorer_slice";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import fileExplorerUi from "./slices/file_explorer_ui_slice";
import sessionReducer from "./slices/message_slice";
import filesReducer from "./slices/filereader_slice";

export const store = configureStore({
  reducer: {
    chatMode: chatModeReducer,
    sideBar: sideBarReducer,
    authentication: authenticationReducer,
    fileExplorer: fileExplorerReducer,
    fileExplorerUi:fileExplorerUi,
    session:sessionReducer,
    files: filesReducer,

  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;