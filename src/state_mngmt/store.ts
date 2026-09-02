import { configureStore } from "@reduxjs/toolkit";
import chatStateReducer from "./slices/chat_mode_slice";
import sideBarReducer from "./slices/toggle_sidebar";
import authenticationReducer from "./slices/authentication_slice";
import fileExplorerReducer from "./slices/file_explorer_slice";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import fileExplorerUi from "./slices/file_explorer_ui_slice";
import filesReducer from "./slices/filereader_slice";
import folderCreationReducer from "./slices/create_folder";
import selectItemReducer from "./slices/select_item_slice";
import { storageApi } from "./api/storage_api";
import sessionReducer from "./slices/session_slice_practice";

export const store = configureStore({
  reducer: {
    chatState: chatStateReducer,
    sideBar: sideBarReducer,
    authentication: authenticationReducer,
    fileExplorer: fileExplorerReducer,
    fileExplorerUi: fileExplorerUi,
    session: sessionReducer,
    files: filesReducer,
    folderCreation: folderCreationReducer,
    selectItems: selectItemReducer,
    cloudFile: filesReducer,
    [storageApi.reducerPath]: storageApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(storageApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();