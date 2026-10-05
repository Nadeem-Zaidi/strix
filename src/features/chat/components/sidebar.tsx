
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faPenToSquare,
  faMagnifyingGlass,
  faDatabase,
  faRightFromBracket,
  faRobot,
  faDiagramProject,
  faChartColumn,
  faCreditCard,
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { useSelector } from "react-redux";
import { toggleSideBar } from "@/features/chat/state/sidebar_slice";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/store";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/shared/lib/firebase";
import { logOutUser } from "@/features/auth/state/auth_slice";
import {
  loadSessions,
  setActiveSession,
  clearCacheMessage,
  setChatMode,
} from "@/features/chat/state/session_slice";
import { useLocation, useNavigate } from "react-router-dom";
import { OwlMark } from "@/shared/ui/owl_icon";
import { AgentAvatar } from "@/shared/ui/agent_avatar";
import { WhatsAppConnect } from "@/features/whatsapp/components/whatsapp_connect";
import { BILLING_CHANGED, billingApi } from "@/features/billing/api/billing_api";

// Compact "last active" label for a Recents row: time today, "Yesterday",
// weekday within the week, then a short date (with year if not this year).
export function formatRecentTime(iso: string | undefined, now = new Date()): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (days <= 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], d.getFullYear() === now.getFullYear()
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" });
}

export interface SideDrawerProps {
  /** Which chat widget this sidebar controls — must match the `windowId`
   *  passed to the paired <ChatPage />. Defaults to "chat-page" so existing
   *  call sites that don't pass this keep working unchanged. */
  windowId?: string;
}

export const SideDrawer = ({ windowId = "chat-page" }: SideDrawerProps = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  // Account menu (opens from the profile at the bottom of the sidebar).
  const [accountOpen, setAccountOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ left: number; bottom: number; width: number } | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  // Fixed to the window so it isn't clipped by the (narrow, overflow-hidden) sidebar.
  const toggleAccount = (el: HTMLElement) => {
    if (accountOpen) return setAccountOpen(false);
    const r = el.getBoundingClientRect();
    setMenuPos({ left: r.left, bottom: window.innerHeight - r.top + 8, width: Math.max(r.width, 240) });
    setAccountOpen(true);
  };
  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => { if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setAccountOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [accountOpen]);
  const goFromMenu = (path: string) => { setAccountOpen(false); closeMobileDrawer(); navigate(path); };

  // Shown under the user's name; loaded once and again after visiting billing.
  const [planName, setPlanName] = useState<string | null>(null);
  const onBilling = location.pathname === "/billing";
  useEffect(() => {
    const load = () => billingApi.overview()
      .then((o) => setPlanName(o.plans.find((p) => p.id === o.plan)?.name ?? null))
      .catch(() => setPlanName(null));
    void load();
    window.addEventListener(BILLING_CHANGED, load);
    return () => window.removeEventListener(BILLING_CHANGED, load);
  }, [onBilling]);

  // Ctrl/Cmd+K opens Search chats from anywhere the sidebar is shown.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigate("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);
  // From other pages (agents, files) — or a ?agent= chat — go back to plain chat.
  const goToChat = () => {
    if (location.pathname !== "/chathome" || location.search) navigate("/chathome");
  };
  const showSideBar = useSelector((state: any) => state.sideBar.showSideBar);
  const dispatch = useAppDispatch();
  const { sessions } = useAppSelector((state) => state.session);
  // Latest activity first — also after a reply bumps an older chat's updated_at.
  const recentSessions = useMemo(
    () => [...(sessions ?? [])].sort((a, b) => (Date.parse(b.updated_at) || 0) - (Date.parse(a.updated_at) || 0)),
    [sessions]
  );
  // Re-render once a minute so "Yesterday" etc. roll over without a reload.
  const [, setClock] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setClock((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, []);

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
  const [whatsAppOpen, setWhatsAppOpen] = useState(false);
  const expanded = showSideBar || mobileOpen;
  const closeMobileDrawer = () => setMobileOpen(false);

  const handleClick = (sessionId: string) => {
    closeMobileDrawer();
    goToChat();
    if (sessionId === activeSessionId) return; // already viewing this chat
    dispatch(setActiveSession({ windowId, sessionId }));
    dispatch(setChatMode({ windowId, chatMode: true }));
  };

  const handleNewChat = () => {
    closeMobileDrawer();
    goToChat();
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

  // Chats started on WhatsApp appear without a reload when you come back to the tab.
  useEffect(() => {
    const refresh = () => {
      if (auth.currentUser) dispatch(loadSessions());
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [dispatch]);

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
          {/* Always rendered: it fades and gets clipped by the narrowing
              sidebar instead of popping in/out mid-animation. */}
          <h2 className="sidebar_brand" aria-hidden={!expanded}>
            <OwlMark size={20} />
            Strix
          </h2>
          <button className="toggle_btn" onClick={toggleSideBarFunc}>
            <FontAwesomeIcon icon={faBars} />
          </button>
        </div>

        <ul className="menu">
          <li className="menu_item menu_item--primary" onClick={handleNewChat}>
            <FontAwesomeIcon icon={faPenToSquare} className="menu_icon" />
            <span>New chat</span>
          </li>
          <li
            className={`menu_item ${location.pathname === "/search" ? "menu_item--active" : ""}`}
            title="Search chats (Ctrl+K)"
            onClick={() => {
              closeMobileDrawer();
              navigate("/search");
            }}
          >
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
            <span>Knowledge base</span>
          </li>
          <li
            className={`menu_item ${(location.pathname.startsWith("/agents") || location.pathname.startsWith("/native-agents")) ? "menu_item--active" : ""}`}
            onClick={() => {
              closeMobileDrawer();
              navigate("/agents");
            }}
          >
            <FontAwesomeIcon icon={faRobot} className="menu_icon" />
            <span>Agents</span>
          </li>
          <li
            className={`menu_item ${location.pathname.startsWith("/pipelines") ? "menu_item--active" : ""}`}
            onClick={() => {
              closeMobileDrawer();
              navigate("/pipelines");
            }}
          >
            <FontAwesomeIcon icon={faDiagramProject} className="menu_icon" />
            <span>Pipelines</span>
          </li>
          <li
            className="menu_item"
            onClick={() => {
              closeMobileDrawer();
              setWhatsAppOpen(true);
            }}
          >
            <FontAwesomeIcon icon={faWhatsapp} className="menu_icon menu_icon--whatsapp" />
            <span>Connect WhatsApp</span>
          </li>
        </ul>

        {/* ─── Chat History ────────────────────────────── */}
        {/* Kept mounted while collapsed (hidden via CSS) so expanding doesn't
            drop a full list into a still-narrow sidebar. */}
        <div className="sidebar_chat_section" aria-hidden={!expanded}>
            <div className="chat_section_label">Recents</div>
            {recentSessions.map((session) => {
              const isStreamingInBackground = streamingSessionIds.includes(session.id);
              return (
                <div
                  key={session.id}
                  className={`chat_history_item ${
                    session.id === activeSessionId ? "chat_history_active" : ""
                  } ${isStreamingInBackground ? "chat_history_streaming" : ""}`}
                  onClick={() => handleClick(session.id)}
                >
                  {session.agent_icon && (
                    <span className="chat_history_agent" title={session.agent_name ?? "Agent"}><AgentAvatar icon={session.agent_icon} /></span>
                  )}
                  {session.source === "whatsapp" && (
                    <FontAwesomeIcon icon={faWhatsapp} className="chat_history_source" title="Started on WhatsApp" />
                  )}
                  <span className="chat_history_title">{session.title || "New Chat"}</span>
                  {!isStreamingInBackground && session.updated_at && (
                    <time className="chat_history_time" dateTime={session.updated_at} title={new Date(session.updated_at).toLocaleString()}>
                      {formatRecentTime(session.updated_at)}
                    </time>
                  )}
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

        {/* ─── Bottom ──────────────────────────────────── */}
        <div className="sidebar_bottom_section" ref={accountRef}>
          {accountOpen && (
            <div className="account_menu" role="menu" aria-label="Account"
              style={menuPos ? { left: menuPos.left, bottom: menuPos.bottom, width: menuPos.width } : undefined}>
              <div className="account_menu__email">{auth.currentUser?.email ?? auth.currentUser?.phoneNumber ?? "Signed in"}</div>
              <button type="button" role="menuitem" className={location.pathname === "/usage" ? "is_active" : ""} onClick={() => goFromMenu("/usage")}>
                <FontAwesomeIcon icon={faChartColumn} className="account_menu__icon" /> Usage
              </button>
              <button type="button" role="menuitem" className={location.pathname === "/billing" ? "is_active" : ""} onClick={() => goFromMenu("/billing")}>
                <FontAwesomeIcon icon={faCreditCard} className="account_menu__icon" /> Plan & billing
                {planName && <span className="account_menu__hint">{planName}</span>}
              </button>
              <div className="account_menu__sep" />
              <button type="button" role="menuitem" onClick={() => { setAccountOpen(false); void handleLogout(); }}>
                <FontAwesomeIcon icon={faRightFromBracket} className="account_menu__icon" /> Log out
              </button>
            </div>
          )}
          <button
            type="button"
            className={`sidebar_user_profile ${accountOpen ? "is_open" : ""}`}
            onClick={(e) => toggleAccount(e.currentTarget)}
            aria-haspopup="menu"
            aria-expanded={accountOpen}
            title="Account"
          >
            <span className="user_avatar">
              {auth.currentUser?.displayName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "?"}
            </span>
            {expanded && (
              <span className="user_info">
                <span className="user_name">{auth.currentUser?.displayName}</span>
                <span className="user_plan">{planName ? `${planName} plan` : " "}</span>
              </span>
            )}
          </button>
        </div>
      </div>
      {whatsAppOpen && <WhatsAppConnect mode="connect" onClose={() => setWhatsAppOpen(false)} />}
    </>
  );
};
