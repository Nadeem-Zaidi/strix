import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase/firebase_config";
import type { FilesResult, Message, Session } from "../types";

const BASE = "http://localhost:3000";

export const getAuthHeader = async () => {
  const user = auth.currentUser ?? await new Promise<any>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });

  if (!user) throw new Error("Not authenticated");

  const token = await user.getIdToken();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};


export const api = {
  getSessions: async (): Promise<Session[]> => {
    const headers = await getAuthHeader();
    const res = await fetch(`${BASE}/sessions`, { headers });
    if (!res.ok) throw new Error("Failed to fetch sessions");

    const result = await res.json();
    console.log(result);
    return result;
  },

  newSession: async (): Promise<Session> => {
    const headers = await getAuthHeader();
    const res = await fetch(`${BASE}/newsessions`, {
      method: "POST",
      headers,
    });
    if (!res.ok) throw new Error("Failed to create session");
    return res.json();
  },

  getMessages: async (sessionId: string): Promise<Message[]> => {
    try {
      console.log("before auth");
      const headers = await getAuthHeader();
      console.log(headers)
      console.log("after auth")
      const res = await fetch(`${BASE}/sessions/${sessionId}/messages`, {
        headers,
      });
      if (!res.ok) throw new Error("Failed to fetch messages");
      const rows = await res.json();
      console.log(rows);
      return rows
        .filter((m: any) => m.role === "user" || m.role === "assistant")
        .map((m: any) => ({
          role: m.role === "assistant" ? "bot" : ("user" as "user" | "bot"),
          text: m.content,
        }));

    } catch (error) {
      console.log(error);
      throw error

    }

  },
  getSession: async (sessionId: string) => {
    const headers = await getAuthHeader();
    const res = await fetch(`${BASE}/sessions/:${sessionId}/`, {
      headers,
    });
    if (!res.ok) throw new Error("Failed to fetch session");
    const result = await res.json();
    return result;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    const headers = await getAuthHeader();
    await fetch(`${BASE}/sessions/${sessionId}`, {
      method: "DELETE",
      headers,
    });
  },

  getFiles: async (nextToken: string | undefined): Promise<FilesResult> => {
    const headers = await getAuthHeader();
    let url: string = `${BASE}/getFiles`;
    if (nextToken) {
      url += `?token=${nextToken}`;
    }
    const response = await fetch(url, {
      method: "GET",
      headers
    });
    if (!response.ok) throw new Error("Failed to fetch the files");
    const result = await response.json();
    console.log(result)
    return {
      files: result.files,
      nextToken: result.nextToken
    }
  },
  deleteFile: async (keys: string[]) => {
    const headers = await getAuthHeader();
    if (!keys.length) {
      throw new Error("No files to delete")
    }
    const res = await fetch(`${BASE}/delete`, {

      method: 'DELETE',
      headers,
      body: JSON.stringify({ keys })

    });

    if (!res.ok) throw new Error('Delete Failed')
    return await res.json()


  },
  uploadFile: async (files: File[], prefix: string = ''): Promise<void> => {
    try {
      const user = auth.currentUser ?? await new Promise<any>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });

      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken();

      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('prefix', prefix);

      const res = await fetch(`${BASE}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`, // ✅ ONLY this
        },
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');

      return res.json();
    } catch (error) {
      console.log(error);
      throw error;
    }
  },
  createFolder: async (folderName: string) => {
    const headers = await getAuthHeader();
    let url: string = `${BASE}/createFolder`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ folderName: folderName })

      });
      if (!res.ok) throw new Error("Folder creation failed")
      const result = await res.json();
      return result
    } catch (error) {
      throw error;
    }
  }
};
