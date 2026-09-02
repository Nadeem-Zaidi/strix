import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../helper/helper_api_functions";
import type { FilesResult, S3FileType } from "../../types";
import type { RootState } from "../store";
import { generateRag } from "./file_explorer_ui_slice";


const loadBreadCrumb = () => {
  try {
    const bc = sessionStorage.getItem("breadCrumb")
    return bc ? JSON.parse(bc) : []

  } catch (error) {
    return []
  }
}




type FileState = {
  loading: boolean;
  fileList: S3FileType[];
  nextToken: string | undefined | null;
  error: string | null;
  selected: string[];
  breadCrumb: string[]

};

const initialState: FileState = {
  loading: false,
  fileList: [],
  nextToken: undefined,
  error: null,
  selected: [],
  breadCrumb: loadBreadCrumb()
}

export const getFiles = createAsyncThunk<FilesResult, { nextToken?: string | undefined; prefix?: string } | undefined>(
  "filereader/getFiles",
  async (payload, thunkAPI) => {
    const { nextToken, prefix = "" } = payload || {};
    try {
      return await api.getFiles(nextToken, prefix);
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
      console.log(prefix)
      await api.uploadFile(files, prefix);
      const refetchPrefix = prefix.length > 0 ? prefix : undefined;
      thunkAPI.dispatch(getFiles({ prefix: refetchPrefix, nextToken: undefined }));
    } catch (error) {
      return thunkAPI.rejectWithValue({ error: "Failed to upload files" });
    }
  }
);
export const createFolder = createAsyncThunk<void, { folderName: string }>(
  "filereader/createFolder",
  async ({ folderName }, thunkAPI) => {
    try {
      const state = thunkAPI.getState() as RootState;
      const breadCrumb = state.files.breadCrumb;
      const prefix = breadCrumb.length > 0 ? `${breadCrumb.join('/')}/` : undefined;

      const result = await api.createFolder(folderName);
      if (result.success) {
        thunkAPI.dispatch(getFiles({ prefix, nextToken: undefined })); 
      }
    } catch (error) {
      return thunkAPI.rejectWithValue({ error: "Failed to create the folder" });
    }
  }
);

export const generateRAG=createAsyncThunk<void,{prefix:string}>(
  "filereader/generaterag",
  async({prefix},thunkAPI)=>{
    try{
      const state=thunkAPI.getState() as RootState;
      const result=await api.generateRag(prefix)
      if(result.success){

      }

    }catch(error){
      return thunkAPI.rejectWithValue({error:"Failed Generating Rag"})

    }
  }

)

const filesSlice = createSlice({
  name: "filereader",
  initialState: initialState,
  reducers: {
    toggleSelected(state, action: PayloadAction<string>) {
      const key = action.payload;
      const index = state.selected.indexOf(key);
      if (index == -1) {
        state.selected.push(key);
      }

    },
    addpath(state, action: PayloadAction<string>) {
      const newPath = action.payload;
      if (!state.breadCrumb.includes(action.payload)) {
        state.breadCrumb.push(newPath);
        sessionStorage.setItem('breadCrumb', JSON.stringify(state.breadCrumb))
      };
    },
    resetPath(state) {
      state.breadCrumb = [];
      sessionStorage.removeItem('breadCrumb'); // ✅
    },
    slicePath(state, action: PayloadAction<number>) {
      state.breadCrumb = state.breadCrumb.slice(0, action.payload);
      sessionStorage.setItem('breadCrumb', JSON.stringify(state.breadCrumb)); // ✅
    },
    navigateTo(state, action: PayloadAction<number>) {
      state.breadCrumb = state.breadCrumb.slice(0, action.payload + 1);
      sessionStorage.setItem('breadCrumb', JSON.stringify(state.breadCrumb)); // ✅
    },
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
          (f: any) => !action.meta.arg.includes(f.key)
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
      .addCase(generateRAG.pending,(state)=>{
        state.loading=true;
      })
      .addCase(generateRag.fulfilled,(state)=>{
        state.loading=false;
      })
      .addCase(generateRAG.rejected,(state)=>{
        state.loading=false;
        state.error="Failed to generate rag "
      })
  }
})

export const { addpath, navigateTo, resetPath, slicePath } = filesSlice.actions;
export default filesSlice.reducer;

