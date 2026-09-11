import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth"; // adjust to however you access the Firebase client auth instance
function waitForAuthUser(): Promise<User | null> {
    const auth = getAuth();
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            resolve(user);
        });
    });
}
export interface CloudFile {
    key: string;
    name: string;
    lastModified: string | null;
    size?: number;
    url?: string;
}

export interface ListFilesResponse {
    files: CloudFile[];
    continuationToken?: string | null;
}

export interface ListFilesArgs {
    continuationToken?: string;
    // When set, the backend switches /list_files into search mode: it walks
    // every page under the user's prefix server-side (S3 has no substring
    // search — see storage_routes.ts) and returns matches directly, with no
    // continuationToken, since a search result set isn't meant to be paged
    // through the same way a plain listing is.
    search?: string;
}

export interface UploadFilesResponse {
    uploaded: number;
}

export interface DeleteFilesResponse {
    message: string;
    deleted: number;
}

export const storageApi = createApi({
    reducerPath: "storageApi",
    baseQuery: fetchBaseQuery({
        baseUrl: "http://localhost:3000",
        prepareHeaders: async ( headers) => {
            const user = await waitForAuthUser();
            if (user) {
                const token = await user.getIdToken();
                headers.set("Authorization", `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ["File"],
    endpoints: (builder) => ({
        listFiles: builder.query<ListFilesResponse, ListFilesArgs | undefined>({
            query: (args) => {
                const params: Record<string, string> = {};
                if (args?.continuationToken) params.continuationToken = args.continuationToken;
                if (args?.search) params.search = args.search;
                return {
                    url: "/list_files",
                    params: Object.keys(params).length ? params : undefined,
                };
            },
            // RTK Query caches each distinct arg shape separately, so a search
            // query and the plain listing don't clobber each other's cache —
            // switching the search box back to empty falls right back to the
            // already-cached first page instead of refetching.
            providesTags: (result) =>
                result?.files
                    ? [
                        ...result.files.map((f) => ({ type: "File" as const, id: f.key })),
                        { type: "File" as const, id: "LIST" },
                    ]
                    : [{ type: "File" as const, id: "LIST" }],
        }),

        uploadFiles: builder.mutation<UploadFilesResponse, { files: File[]; prefix?: string }>({
            query: ({ files, prefix }) => {
                const formData = new FormData();
                files.forEach((file) => formData.append("files", file));
                formData.append("prefix", prefix ?? "");
                return { url: "/upload", method: "POST", body: formData };
                // fetchBaseQuery detects FormData and skips JSON stringify/content-type — no extra config needed.
            },
            invalidatesTags: [{ type: "File", id: "LIST" }], // this is the whole payoff: upload succeeds → list auto-refetches
        }),

        deleteFiles: builder.mutation<DeleteFilesResponse, string[]>({
            query: (keys) => ({
                url: "/delete",
                method: "DELETE",
                body: { keys },
            }),
            // invalidate the specific rows deleted plus the list itself, so the
            // table refetches and the removed files disappear without a manual reload
            invalidatesTags: (_result, _error, keys) => [
                ...keys.map((key) => ({ type: "File" as const, id: key })),
                { type: "File" as const, id: "LIST" },
            ],
        }),
    }),
});

export const { useListFilesQuery, useUploadFilesMutation, useDeleteFilesMutation } = storageApi;