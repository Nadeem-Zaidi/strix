import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { FilesList, FilesResult, Folder } from "../../types";
import { api } from "../../helper/helper_api_functions";






type FileState = {
  loading: boolean;
  fileList: Folder[] | FilesList [];
  nextToken: string | undefined | null;
  error:string | null;
};

const initialState:FileState={
    loading:false,
    fileList:[],
    nextToken:undefined,
    error:null
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

export const deleteFiles=createAsyncThunk(
    "filereader/deletefile",
    async()=>{
        
    }
)

const filesSlice=createSlice({
    name:"filereader",
    initialState:initialState,
    reducers:{},
    extraReducers:(builder)=>{
        builder
        .addCase(getFiles.pending,(state)=>{
            state.loading=true;
        })
        .addCase(getFiles.fulfilled,(state,action)=>{
            state.loading=false;
            state.fileList=action.payload.files;
            state.nextToken=action.payload.nextToken;
        })
        .addCase(getFiles.rejected,(state,action)=>{
            state.loading=false
            state.error=action.error.message ?? "Failed to fetch files";

        })
    }
})

export default filesSlice.reducer;

