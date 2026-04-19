import "../../global/chat.css"

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBars,
  faPenToSquare,
  faMagnifyingGlass,
} from '@fortawesome/free-solid-svg-icons'
import { useDispatch, useSelector } from 'react-redux'
import { toggleSideBar } from '../../state_mngmt/slices/toggle_sidebar'
import { useEffect } from "react"
import { fetchMessages, fetchSessions, setCurrentSession } from "../../state_mngmt/slices/message_slice"
import { useAppDispatch, useAppSelector } from "../../state_mngmt/store"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../../firebase/firebase_config"

export const SideDrawer = () => {
  const showSideBar = useSelector((state: any) => state.sideBar.showSideBar)
  const dispatch = useDispatch()
  const appDispatch = useAppDispatch()
  const { sessions, currentSessionId } = useAppSelector(state => state.session)

  const toggleSideBarFunc = () => {
    dispatch(toggleSideBar())
  }

  const handleClick = (s: string) => {
    appDispatch(fetchMessages(s))
    appDispatch(setCurrentSession(s));
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        appDispatch(fetchSessions())
      }
    })
    return () => unsubscribe()
  }, [appDispatch])

  return (
    <div className={showSideBar ? "sidebar" : "sidebar collapsed"}>
      {/* ─── Top Section ─────────────────────────────── */}
      <div className="sidebar_topsection">
        {showSideBar && <h2 className="sidebar_brand">Strix</h2>}
        <button className="toggle_btn" onClick={toggleSideBarFunc}>
          <FontAwesomeIcon icon={faBars} />
        </button>
      </div>

      {/* ─── Actions ─────────────────────────────────── */}
      <ul className="menu">
        <li className="menu_item">
          <FontAwesomeIcon icon={faPenToSquare} className="menu_icon" />
          <span>New chat</span>
        </li>
        <li className="menu_item">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="menu_icon" />
          <span>Search chats</span>
        </li>
        <li className="menu_item">
          <FontAwesomeIcon icon={faMagnifyingGlass} className="menu_icon" />
          <span>Create RAG</span>
        </li>
      </ul>

      {/* ─── Chat History ────────────────────────────── */}
      {showSideBar && <div className="sidebar_chat_section">
        {showSideBar && <div className="chat_section_label">Recents</div>}
        {sessions?.map((session) => (
          <div
            key={session.id}
            className={`chat_history_item ${session.id === currentSessionId ? "chat_history_active" : ""}`}
            onClick={() => handleClick(session.id)}
          >
            <span className="chat_history_title">{session.title || "New Chat"}</span>
          </div>
        ))}
      </div>}

      {/* ─── Bottom ──────────────────────────────────── */}
      <div className="sidebar_bottom_section">
        {showSideBar && (
          <div className="sidebar_user_profile">
            <div className="user_avatar">
              {auth.currentUser?.displayName
                ?.split(" ")
                .map(n => n[0])
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
  )
}
