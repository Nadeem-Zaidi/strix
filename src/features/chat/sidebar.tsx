import "./chat.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faPenToSquare,
  faMagnifyingGlass,
  faDatabase,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { toggleSideBar } from "./toggle_sidebar";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../shared/firebase_config";
import { logOutUser } from "../auth/authentication_slice";
import {
  loadSessions,
  setActiveSession,
  clearCacheMessage,
  setChatMode,
} from "./session_slice_practice";
import { useNavigate } from "react-router-dom";

export interface SideDrawerProps {
  /** Which chat widget this sidebar controls — must match the `windowId`
   *  passed to the paired <ChatPage />. Defaults to "chat-page" so existing
   *  call sites that don't pass this keep working unchanged. */
  windowId?: string;
}

export const SideDrawer = ({ windowId = "chat-page" }: SideDrawerProps = {}) => {
  const navigate = useNavigate();
  const showSideBar = useSelector((state: any) => state.sideBar.showSideBar);
  const dispatch = useAppDispatch();
  const { sessions } = useAppSelector((state) => state.session);

  const activeSessionId = useAppSelector((state) => state.session.windows[windowId]?.activeSessionId ?? null);
  const streamingSessionIds = useAppSelector((state) => state.session.streamingSessionIds ?? []);
  const toggleSideBarFunc = () => {
    dispatch(toggleSideBar());
  };

  const handleClick = (sessionId: string) => {
    if (sessionId === activeSessionId) return; // already viewing this chat
    dispatch(setActiveSession({ windowId, sessionId }));
    dispatch(setChatMode({ windowId, chatMode: true }));
  };

  const handleNewChat = () => {
    dispatch(setActiveSession({ windowId, sessionId: null }));
    dispatch(clearCacheMessage({ windowId }));
    dispatch(setChatMode({ windowId, chatMode: false }));
  };

  const handleLogout = async () => {
    // logOutUser calls auth.signOut() AND clears the redux authentication
    // state on success — dispatching the plain signOut() reducer instead
    // would only clear redux, leaving the real Firebase session alive so
    // the next refresh silently signs the user back in.
    await dispatch(logOutUser());
    navigate("/");
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        dispatch(loadSessions());
      }
    });
    return () => unsubscribe();
  }, [dispatch]);

  return (
    <div className={showSideBar ? "sidebar" : "sidebar collapsed"}>
      <div className="sidebar_topsection">
        {showSideBar && <h2 className="sidebar_brand">Strix</h2>}
        <button className="toggle_btn" onClick={toggleSideBarFunc}>
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      <ul className="menu">
        <li className="menu_item" onClick={handleNewChat}>
          <FontAwesomeIcon icon={faPenToSquare} className="menu_icon" />
          <span>New chat</span>
        </li>
        <li className="menu_item">
          {/* TODO: no search feature/route exists yet — wire this up once
              there's somewhere for it to go. */}
          <FontAwesomeIcon icon={faMagnifyingGlass} className="menu_icon" />
          <span>Search chats</span>
        </li>
        <li className="menu_item" onClick={() => navigate("/file_explorer")}>
          <FontAwesomeIcon icon={faDatabase} className="menu_icon" />
          <span>Create RAG</span>
        </li>
      </ul>

      {/* ─── Chat History ────────────────────────────── */}
      {showSideBar && (
        <div className="sidebar_chat_section">
          <div className="chat_section_label">Recents</div>
          {sessions?.map((session) => {
            const isStreamingInBackground = streamingSessionIds.includes(session.id);
            return (
              <div
                key={session.id}
                className={`chat_history_item ${
                  session.id === activeSessionId ? "chat_history_active" : ""
                } ${isStreamingInBackground ? "chat_history_streaming" : ""}`}
                onClick={() => handleClick(session.id)}
              >
                <span className="chat_history_title">{session.title || "New Chat"}</span>
                {isStreamingInBackground && (
                  <span className="chat_history_streaming_indicator" title="Still generating…" aria-label="Still generating">
                    <span className="chat_history_streaming_dot" />
                    <span className="chat_history_streaming_dot" />
                    <span className="chat_history_streaming_dot" />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Bottom ──────────────────────────────────── */}
      <div className="sidebar_bottom_section">
        {showSideBar && (
          <div className="sidebar_user_profile">
            <div className="user_avatar">
              {auth.currentUser?.displayName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?"}
            </div>
            <div className="user_info">
              <span className="user_name">{auth.currentUser?.displayName}</span>
              <span className="user_plan">Free plan</span>
            </div>
            <button
              type="button"
              className="logout_btn"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <FontAwesomeIcon icon={faRightFromBracket} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
