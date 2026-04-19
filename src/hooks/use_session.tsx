import { useCallback, useEffect, useState } from "react";
import type { Session } from "../types";
import { api } from "../helper/helper_api_functions";

export const useSessions = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api
            .getSessions()
            .then(setSessions)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const createSession = useCallback(async (): Promise<Session> => {
        const session = await api.newSession();
        setSessions((prev) => [session, ...prev]);
        return session;
    }, []);

    const removeSession = useCallback(async (sessionId: string) => {
        await api.deleteSession(sessionId);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    }, []);

    const refreshPreview = useCallback(
        (sessionId: string, lastMessage: string) => {
            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId
                        ? {
                            ...s,
                            last_message: lastMessage,
                            updated_at: new Date().toISOString(),
                        }
                        : s
                )
            );
        },
        []
    );

    return { sessions, loading, createSession, removeSession, refreshPreview };
};