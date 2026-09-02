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
}

export interface ListFilesResponse {
    files: CloudFile[];
    continuationToken?: string | null;
}

export interface UploadFilesResponse {
    uploaded: number;
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
        listFiles: builder.query<ListFilesResponse, string | undefined>({
            query: (continuationToken) => ({
                url: "/list_files",
                params: continuationToken ? { continuationToken } : undefined,
            }),
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
    }),
});

export const { useListFilesQuery, useUploadFilesMutation } = storageApi;