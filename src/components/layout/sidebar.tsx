import "../../global/chat.css";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faPenToSquare,
  faMagnifyingGlass,
  faDatabase,
} from "@fortawesome/free-solid-svg-icons";
import { useSelector } from "react-redux";
import { toggleSideBar } from "../../state_mngmt/slices/toggle_sidebar";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../state_mngmt/store";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase/firebase_config";
import {
  loadMessages,
  loadSessions,
  setActiveSession,
  clearCacheMessage,
  setChatMode,
} from "../../state_mngmt/slices/session_slice_practice";
import { useNavigate } from "react-router-dom";

export const SideDrawer = () => {
  const navigate = useNavigate();
  const showSideBar = useSelector((state: any) => state.sideBar.showSideBar);
  const dispatch = useAppDispatch();
  const windowId = 'chat-page';

  // `sessions` is global/shared across every chat window.
  const { sessions } = useAppSelector((state) => state.session);
  // `activeSessionId` and `chatMode` are per-window — the sidebar acts on
  // the same window the chat page renders (CHAT_WINDOW_ID).
  const activeSessionId = useAppSelector((state) => state.session.windows[windowId]?.activeSessionId ?? null);
  const chatMode = useAppSelector((state) => state.session.windows[windowId]?.chatMode ?? false);

  const toggleSideBarFunc = () => {
    dispatch(toggleSideBar());
  };

  const handleClick = (sessionId: string) => {
    dispatch(setActiveSession({ windowId, sessionId }));
    dispatch(loadMessages({ windowId, sessionId }));
  };

  const handleNewChat = () => {
    dispatch(setActiveSession({ windowId, sessionId: null }));
    dispatch(clearCacheMessage({ windowId }));
    dispatch(setChatMode({ windowId, chatMode: false }));
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
          {sessions?.map((session) => (
            <div
              key={session.id}
              className={`chat_history_item ${
                session.id === activeSessionId ? "chat_history_active" : ""
              }`}
              onClick={() => handleClick(session.id)}
            >
              <span className="chat_history_title">{session.title || "New Chat"}</span>
            </div>
          ))}
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
          </div>
        )}
      </div>
    </div>
  );
};
