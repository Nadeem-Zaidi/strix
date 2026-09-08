import { configureStore } from "@reduxjs/toolkit";
import chatStateReducer from "../features/chat/chat_mode_slice";
import sideBarReducer from "../features/chat/toggle_sidebar";
import authenticationReducer from "../features/auth/authentication_slice";
import { useDispatch, useSelector} from "react-redux";
import { storageApi } from "../features/storage/storage_api";
import sessionReducer from "../features/chat/session_slice_practice";

export const store = configureStore({
  reducer: {
    chatState: chatStateReducer,
    sideBar: sideBarReducer,
    authentication: authenticationReducer,
    session: sessionReducer,
    [storageApi.reducerPath]: storageApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(storageApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
