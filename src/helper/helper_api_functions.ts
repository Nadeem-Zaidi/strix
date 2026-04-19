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
    if(!response.ok) throw new Error("Failed to fetch the files");
    const result=await response.json();
    return {
      files:result.files,
      nextToken:result.nextToken
    }
  },
  deleteFile:async()=>{

  }
};
