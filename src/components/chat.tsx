import { useEffect, useRef, useState } from "react";
import "../global/chat.css";
import { useChatStream } from "../hooks/use_chat_stream";
import { BotMessage } from "./bot_message";
import { SideDrawer } from "./layout/sidebar";
import { useDispatch, useSelector } from "react-redux";
import { changeChatMode } from "../state_mngmt/slices/chat_mode_slice";
import { useAppDispatch } from "../state_mngmt/store";



export const ChatUi = () => {
  const {
    messages,
    isStreaming,
    sendMessage,
    cancelStream,
  } = useChatStream("http://localhost:3000/chat-stream");
  const chatMode = useSelector((state: any) => state.chatMode.chatMode);
  const dispatch = useDispatch();


  const [input, setInput] = useState("");
  const pageRef = useRef<HTMLDivElement>(null);
  const lastUserMsgRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const lastScrolledIndex = useRef(-1);

  useEffect(() => {
    const cont = pageRef.current;
    if (!cont || messages.length === 0) return;

    const lastMsg = messages[messages.length - 1];

    if (lastMsg.role === "user") {
      const userIndex = messages.length - 1;
      if (userIndex !== lastScrolledIndex.current) {
        lastScrolledIndex.current = userIndex;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const el = lastUserMsgRef.current;
            const c = pageRef.current;
            if (!el || !c) return;
            const er = el.getBoundingClientRect();
            const cr = c.getBoundingClientRect();
            const target = er.top - cr.top + c.scrollTop - 20;
            c.scrollTo({ top: target, behavior: "smooth" });
          });
        });
      }
      return;
    }

    if (lastMsg.role === "bot" && bottomAnchorRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const c = pageRef.current;
          const anchor = bottomAnchorRef.current;
          if (!c || !anchor) return;
          const cr = c.getBoundingClientRect();
          const ar = anchor.getBoundingClientRect();
          if (ar.top > cr.bottom + 100) return;
          if (ar.top < cr.bottom - 50) return;
          const target =
            ar.top - cr.top + c.scrollTop - c.clientHeight + 60;
          c.scrollTo({ top: Math.max(0, target) });
        });
      });
    }
  }, [messages]);

  const handleSend = async () => {

    if (!input.trim() || isStreaming) return;
    if (!chatMode) {
      dispatch(changeChatMode(true));
    }


    sendMessage(input);
    setInput("");
  };

  console.log(messages);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat_main">
      <div className="chat_sections">
        <SideDrawer />
        <div className="chat_plane">
          <div className="chat_topbar">
            <h4>Owl Bot</h4>
          </div>
          <div className={chatMode ? "page" : ""} ref={pageRef}>
            <div
              className="message_area"
              style={{
                paddingBottom:
                  messages.length > 2 ? "calc(100vh - 150px)" : undefined,
              }}
            >
              {messages.length === 0 && (
                <div className="empty_state">
                  {/* <p>
                    {currentSessionId
                      ? "Start the conversation..."
                      : "Click + New Chat to begin"}
                  </p> */}
                </div>
              )}

              {messages.map((msg, i) => {
                const isLastUser =
                  msg.role === "user" &&
                  i === messages.findLastIndex((m) => m.role === "user");

                return msg.role === "user" ? (
                  <div
                    key={i}
                    ref={isLastUser ? lastUserMsgRef : undefined}
                    className="message user_message"
                  >
                    {msg.text}
                  </div>
                ) : (
                  <BotMessage
                    key={i}
                    text={msg.text}
                    cancelled={msg.cancelled}
                    isStreaming={isStreaming && i === messages.length - 1}
                  />
                );
              })}

              <div ref={bottomAnchorRef} />
            </div>
          </div>

          {/* ── Input ──────────────────────────────────── */}
          <div className="chat_input_wrapper">
            <div className="chat_input">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}  // ✅ fixed
              />
              {isStreaming ? (
                <button className="stop_btn" onClick={cancelStream}>
                  ⏹ Stop
                </button>
              ) : (
                <button
                  className="send_btn"
                  onClick={handleSend}

                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};