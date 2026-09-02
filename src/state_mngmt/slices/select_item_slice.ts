import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "../store";         // ← use RootState, not inline types
import type { S3FileType } from "../../types";

export type SelectState = {
    items: Record<string, boolean>;

};

const initialState: SelectState = {
    items: {},
};

const selectItemSlice = createSlice({
    name: "selectItems",
    initialState,
    reducers: {
        toggleItem(state, action: PayloadAction<S3FileType>) {
            const key = "key" in action.payload ? action.payload.key : action.payload.path;
            if (state.items[key]) {
                delete state.items[key];
            } else {
                state.items[key] = true;
            }
        },
        clearItems(state) {
            state.items = {};
        },
        selectAllItems(state, action: PayloadAction<S3FileType[]>) {
            const allKeys = action.payload.map(f => 'key' in f ? f.key : f.path);
            const alreadyAllSelected = allKeys.every(k => state.items[k]);
            if (alreadyAllSelected) {
                state.items = {};
            } else {
                allKeys.forEach(k => { state.items[k] = true; });
            }
        },
    },
});

export const { toggleItem, clearItems, selectAllItems } = selectItemSlice.actions;  // ← both exported
export default selectItemSlice.reducer;

export const selectItems = (state: RootState) => state.selectItems.items;
export const selectSelectedCount = (state: RootState) => Object.keys(state.selectItems.items).length;
export const selectSelectedKeys = (state: RootState) => Object.keys(state.selectItems.items);
export const selectIsSelected = (key: string) => (state: RootState) => !!state.selectItems.items[key];