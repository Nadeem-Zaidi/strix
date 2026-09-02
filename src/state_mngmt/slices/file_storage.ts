import { createSlice, type PayloadAction} from "@reduxjs/toolkit";
import type { CloudFile } from "../api/storage_api";

type CloudFileUiState = { selectedFile: CloudFile | null };
const initialState: CloudFileUiState = { selectedFile: null };

const cloudFileSlice = createSlice({
  name: "cloudFile",
  initialState,
  reducers: {
    setSelectedFile(state, action: PayloadAction<CloudFile | null>) {
      state.selectedFile = action.payload;
    },
  },
});

export const { setSelectedFile } = cloudFileSlice.actions;
export default cloudFileSlice.reducer;