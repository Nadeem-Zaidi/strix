import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FilesList, FilesResult, Folder } from "../../types";
import { api } from "../../helper/helper_api_functions";


type FileState = {
  loading: boolean;
  fileList: (Folder | FilesList)[];
  nextToken: string | undefined | null;
  error: string | null;
  selected: string[];

};

const initialState: FileState = {
  loading: false,
  fileList: [],
  nextToken: undefined,
  error: null,
  selected: [],
}

export const getFiles = createAsyncThunk<FilesResult, string | undefined>(
  "filereader/getFiles",
  async (nextToken, thunkAPI) => {
    try {
      return await api.getFiles(nextToken);
    } catch (err) {
      return thunkAPI.rejectWithValue({ error: "Failed to fetch files" });
    }
  }
);




export const deleteFiles = createAsyncThunk<void, string[]>(
  "filereader/deletefile",
  async (keys, thunkApi) => {
    try {
      return api.deleteFile(keys)

    } catch (error) {
      return thunkApi.rejectWithValue({ error: "Failed to delete files" });
    }
  }
)

export const uploadFiles = createAsyncThunk<void, { files: File[]; prefix?: string }>(
  "filereader/uploadFiles",
  async ({ files, prefix = '' }, thunkAPI) => {
    try {
      await api.uploadFile(files, prefix);
      // refetch the list after upload so UI updates automatically
      thunkAPI.dispatch(getFiles(undefined));
    } catch (error) {
      return thunkAPI.rejectWithValue({ error: "Failed to upload files" });
    }
  }
);

const filesSlice = createSlice({
  name: "filereader",
  initialState: initialState,
  reducers: {
    toggleSelected(state,action:PayloadAction<string>){
      const key=action.payload;
      const index=state.selected.indexOf(key);
      if(index==-1){
        state.selected.push(key);
      }

    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getFiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(getFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.fileList = action.payload.files;
        state.nextToken = action.payload.nextToken;
      })
      .addCase(getFiles.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? "Failed to fetch files";

      })
      .addCase(deleteFiles.pending, (state) => {
        state.loading = true

      })
      .addCase(deleteFiles.fulfilled, (state, action) => {
        state.loading = false;
        state.fileList = state.fileList.filter(
          (f: any) => f.type === 'file' && !action.meta.arg.includes(f.key)
        );
      })
      .addCase(deleteFiles.rejected, (state, action) => {
        state.loading = false;
        state.error = "Failed to delete files"
      })
      .addCase(uploadFiles.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadFiles.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(uploadFiles.rejected, (state) => {
        state.loading = false;
        state.error = "Failed to upload files";
      })
  }
})

export default filesSlice.reducer;

