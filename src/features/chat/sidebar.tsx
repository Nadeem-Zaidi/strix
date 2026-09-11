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
import { useEffect, useState } from "react";
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

  // The desktop layout docks the sidebar beside the chat pane and just
  // shrinks it to an icon rail when "collapsed" — there's no room for that
  // on a phone screen. Below the mobile breakpoint (see chat.css) it instead
  // becomes an off-canvas drawer, opened/closed with this local state
  // rather than the desktop expand/collapse state above, since the two are
  // independent concerns (one is "wide or narrow", the other is "onscreen
  // or off"). `expanded` folds them together so the drawer always renders
  // its full labeled content when a user opens it on mobile, even if the
  // desktop state happened to be left "collapsed".
  const [mobileOpen, setMobileOpen] = useState(false);
  const expanded = showSideBar || mobileOpen;
  const closeMobileDrawer = () => setMobileOpen(false);

  const handleClick = (sessionId: string) => {
    closeMobileDrawer();
    if (sessionId === activeSessionId) return; // already viewing this chat
    dispatch(setActiveSession({ windowId, sessionId }));
    dispatch(setChatMode({ windowId, chatMode: true }));
  };

  const handleNewChat = () => {
    closeMobileDrawer();
    dispatch(setActiveSession({ windowId, sessionId: null }));
    dispatch(clearCacheMessage({ windowId }));
    dispatch(setChatMode({ windowId, chatMode: false }));
  };

  const handleLogout = async () => {
    closeMobileDrawer();
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
    <>
      {/* Always rendered (unlike the toggle button inside the drawer below,
          which scrolls off-screen with it when the drawer is closed) — this
          is the only way to reopen the drawer on mobile. Hidden on desktop
          via CSS; see the "MOBILE SIDEBAR DRAWER" section of chat.css. */}
      <button
        type="button"
        className="mobile_sidebar_toggle"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
      >
        <FontAwesomeIcon icon={faBars} />
      </button>

      {/* Tap-outside-to-close backdrop — mobile only (see chat.css); on
          desktop `mobileOpen` never becomes true so this never renders. */}
      {mobileOpen && <div className="sidebar_backdrop" onClick={closeMobileDrawer} />}

      <div
        className={`sidebar ${expanded ? "" : "collapsed"} ${mobileOpen ? "mobile_open" : ""}`.trim()}
      >
        <div className="sidebar_topsection">
          {expanded && <h2 className="sidebar_brand">Strix</h2>}
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
          <li
            className="menu_item"
            onClick={() => {
              closeMobileDrawer();
              navigate("/file_explorer");
            }}
          >
            <FontAwesomeIcon icon={faDatabase} className="menu_icon" />
            <span>Create RAG</span>
          </li>
        </ul>

        {/* ─── Chat History ────────────────────────────── */}
        {expanded && (
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
          {expanded && (
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
    </>
  );
};
