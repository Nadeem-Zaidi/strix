import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { api } from "../../helper/helper_api_functions";
import { faL } from "@fortawesome/free-solid-svg-icons";


type FolderCreationState = {
    loading: boolean;
    error: string | null;
    folderName: string | null;
    success: boolean;

}

type CreateFolderResponse = {
    success: boolean;
    folder: string;
};

type CreateFolderArgs = {
    folderName: string;
    prefix?: string;
};


const initialState: FolderCreationState = {
    loading: false,
    error: null,
    folderName: null,
    success: false,
}

export const createFolderThunk = createAsyncThunk<void, CreateFolderArgs, { rejectValue: string }>(
    "createFolder/create",
    async ({ folderName, prefix = "" }, thunkAPI) => {
        try {
            await api.createFolder(folderName);
        } catch (error: any) {
            return thunkAPI.rejectWithValue(error.message ?? "Failed to created the folder")

        }

    }
)

const folderCreationSlice = createSlice({
    name: 'createfolder',
    initialState: initialState,
    reducers: {
        setFolderName(state, action: PayloadAction<string>) {
            state.folderName = action.payload
            state.error = null

        },
        createFolderStart(state) {
            state.loading = true;
            state.error = null;
            state.success = false
        },
        resetFolderCreation(state) {
            state.loading = false;
            state.error = null;
            state.folderName = null;
            state.success = false;
        },

    },
    extraReducers: (builder) => {
        builder
            .addCase(createFolderThunk.pending, (state) => {
                state.loading = true;
                state.error = null;
                state.success = false;
            })

            .addCase(createFolderThunk.fulfilled,(state)=>{
                state.loading=false;
                state.error=null;
                state.success=true;
                state.folderName=null;
            })
            .addCase(createFolderThunk.rejected,(state,action)=>{
                state.loading=false;
                state.error=null;
                state.success=false;
                state.error=action.payload??"Something went wrong in creating the folder"
            })

    }
});


export const {setFolderName,resetFolderCreation}=folderCreationSlice.actions;
export default folderCreationSlice.reducer;