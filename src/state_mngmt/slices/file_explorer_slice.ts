import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { BreadCrumb, S3FILE } from "../../types";
import { getAuth } from "firebase/auth";


interface FileExplorerState {
    files: S3FILE[];
    loading: boolean;
    loadingMore: boolean;
    error: string | null;
    selected: string | null;
    breadCrumb: BreadCrumb[];
    nextToken?: string;
    search: string;
};

export const fetchDirectory = createAsyncThunk<{ files: S3FILE[]; nextToken?: string },{ prefix: string; token?: string; append?: boolean }>(
        "fileExplorer/fetchDirectory",
        async ({ prefix, token }) => {
            const url =
                `${import.meta.env.VITE_FETCH_DIRECTORY_URL}` +
                `?prefix=${prefix}${token ? `&token=${encodeURIComponent(token)}` : ""}`;

            const res = await fetch(url,{
                headers:{
                     'Authorization': `Bearer ${await getAuth().currentUser?.getIdToken()}`
                }
            });
            if (!res.ok) throw new Error("Unable to fetch the data");

            const data = await res.json();
            const r: S3FILE[] = [];
            if (data.result.files) {
                r.push(...data.result.files.map((file: S3FILE) => ({
                    type: 'file',
                    name: file.name,
                    prefix: file.prefix,
                    lastModified: file.lastModified               // ← from API
                        ? new Date(file.lastModified).toISOString()  // ← normalize to ISO string
                        : "",
                    size: file.size,
                    url:file.url??""
                })));
            }

            if (data.result.folders) {
                r.push(...data.result.folders.map((file: S3FILE) => ({
                    type: 'folder',
                    name: file.name,
                    prefix: file.prefix,
                    lastModified: file.lastModified               // ← same normalization
                        ? new Date(file.lastModified).toISOString()
                        : "",
                    size: file.size
                })));

            }

            return { files: r, nextToken: data.result.nextToken }
        }
    );

const slice = createSlice({
    name: 'fileExplorer',
    initialState: {
        files: [],
        loading: false,
        loadingMore: false,
        error: null,
        selected: null,
        nextToken: undefined,
        breadCrumb: [{ name: ' ', prefix: ' ' }],
        search: '', 
    } as FileExplorerState,
    reducers: {
        selectItem: (state, action) => {
            state.selected = state.selected === action.payload ? null : action.payload;
        },
        navigateTo: (state, action) => {
            state.breadCrumb = state.breadCrumb.slice(0, action.payload + 1);
            state.selected = null;
            state.search = '';
        },
        openFolder: (state, action) => {
            state.breadCrumb.push({ name: action.payload.name, prefix: `${action.payload.name}/` });
            state.selected = null;
            state.search = '';
        },
        clearError: (state) => {
            state.error = null;
        },

        setSearch: (state, action: { type: string; payload: string }) => {
            state.search = action.payload;
        },

        clearSearch: (state) => {
            state.search = '';
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDirectory.pending, (state, action) => {
                action.meta.arg.append ? (state.loadingMore = true) : (state.loading = false);
                state.error = null;
            })
            .addCase(fetchDirectory.fulfilled, (state, action) => {
                const { files, nextToken } = action.payload;
                action.meta.arg.append ? state.files.push(...files) : (state.files = files);
                console.log("Redux payload:", action.payload);
                state.nextToken = nextToken;
                state.loading = false;
                state.loadingMore = false;
            })
            .addCase(fetchDirectory.rejected, (state, action) => {
                state.error = action.error.message ?? 'Unknown error';
                state.loading = false;
                state.loadingMore = false;
            });
    },
});

export const { selectItem, navigateTo, openFolder, clearError, setSearch, clearSearch } = slice.actions;
export default slice.reducer;
