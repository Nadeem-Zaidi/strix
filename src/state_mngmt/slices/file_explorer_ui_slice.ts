import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import type { FileItem } from "../../types";
import { fetchDirectory } from "./file_explorer_slice";

import { s3, S3_Uploader } from "../../s3_uploader/s3_uploader";

type FileViewType = "list" | "grid";

interface SfItemUpdate {
  id: string;
  status: "idle" | "uploading" | "done" | "error";
  progress?: number;
  error?: string;
}


interface FileExplorerUiState {
  viewtype: FileViewType;
  search: string;
  sideBarOpen: boolean;
  searchExpanded: boolean;
  actionPosition: { x: number; y: number } | null;
  sf: FileItem[];
  ragLoading: boolean;
  ragError: string | null;
  deleteLoading: boolean;
}

const initialState: FileExplorerUiState = {
  viewtype: "list",
  search: "",
  sideBarOpen: false,
  searchExpanded: false,
  actionPosition: null,
  sf: [],
  ragLoading: false,
  ragError: null,
  deleteLoading: false,
};

export const uploadFiles = createAsyncThunk<void, { files: FileItem[]; prefix: string }>(
  "fileExplorerUi/uploadFiles", async ({ files, prefix }, { dispatch }) => {
    for (const item of files) {
      dispatch(updateSfItem({ id: item.id, status: "uploading", progress: 0 }));

      try {
        let sim = 0;

        const interval = setInterval(() => {
          sim = Math.min(sim + Math.random() * 18, 90);

          dispatch(
            updateSfItem({
              id: item.id,
              status: "uploading",
              progress: Math.round(sim),
            })
          );
        }, 200);

        await s3.uploadFile(item.file, prefix);

        clearInterval(interval);

        dispatch(updateSfItem({ id: item.id, status: "done", progress: 100 }));
        dispatch(fetchDirectory({ prefix }));
      } catch (err: any) {
        dispatch(
          updateSfItem({
            id: item.id,
            status: "error",
            error: err.message,
          })
        );
      }
    }
  });

export const generateRag = createAsyncThunk<any, string, { rejectValue: string }>(
  "fileExplorerUi/generateRag", async (prefix, { rejectWithValue }) => {
    try {
      const res = await fetch("http://localhost:3000/api/generate_rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prefix }),
      });

      if (!res.ok) {
        const e = await res.json();
        return rejectWithValue(e.error);
      }

      console.log(await res.json())

      return await res.json();
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  });

export const deleteFiles = createAsyncThunk<void, { keys: string[]; prefix: string }, { rejectValue: string }>(
  "fileExplorerUi/deleteFiles", async ({ keys, prefix }, { dispatch, rejectWithValue }) => {
    if (!keys.length) return rejectWithValue("No keys provided");

    try {
      await s3.deleteFile(keys);
      dispatch(fetchDirectory({ prefix }));
    } catch (err: any) {
      return rejectWithValue(err.message);
    }
  });

const slice = createSlice({
  name: "fileExplorerUi",
  initialState,
  reducers: {
    setViewType: (state, action: PayloadAction<FileViewType>) => {
      state.viewtype = action.payload;
    },

    setSearch: (state, action: PayloadAction<string>) => {
      state.search = action.payload;
    },

    toggleSidebar: (state) => {
      state.sideBarOpen = !state.sideBarOpen;
    },

    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sideBarOpen = action.payload;
    },

    setSearchExpanded: (state, action: PayloadAction<boolean>) => {
      state.searchExpanded = action.payload;
    },

    setActionPosition: (
      state,
      action: PayloadAction<{ x: number; y: number } | null>
    ) => {
      state.actionPosition = action.payload;
    },

    setSf: (state, action: PayloadAction<FileItem[]>) => {
      state.sf = action.payload;
    },

    updateSfItem: (state, action: PayloadAction<SfItemUpdate>) => {
      const { id, status, progress, error } = action.payload;

      const item = state.sf.find((f) => f.id === id);

      if (!item) return;

      item.status = status;

      if (progress !== undefined) item.progress = progress;

      if (error !== undefined) item.error = error;
    },
  },

  extraReducers: (builder) => {
    builder

      .addCase(generateRag.pending, (state) => {
        state.ragLoading = true;
        state.ragError = null;
      })

      .addCase(generateRag.fulfilled, (state) => {
        state.ragLoading = false;
      })

      .addCase(generateRag.rejected, (state, action) => {
        state.ragLoading = false;
        state.ragError = action.payload ?? "Failed";
      })

      .addCase(deleteFiles.pending, (state) => {
        state.deleteLoading = true;
      })

      .addCase(deleteFiles.fulfilled, (state) => {
        state.deleteLoading = false;
      })

      .addCase(deleteFiles.rejected, (state) => {
        state.deleteLoading = false;
      })
      .addCase(uploadFiles.fulfilled, (state, action) => {
        // optionally clear sf here
        state.sf = [];
      });
  },
});

export const {
  setViewType,
  setSearch,
  toggleSidebar,
  setSidebarOpen,
  setSearchExpanded,
  setActionPosition,
  setSf,
  updateSfItem,
} = slice.actions;

export default slice.reducer;