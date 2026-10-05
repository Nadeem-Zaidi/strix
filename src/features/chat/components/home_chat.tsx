import "./chat.css";
import { SideDrawer } from "./sidebar";
import { ChatPage } from "./chat";
const HOME_CHAT_WINDOW_ID = "chat-page";

export const HomeChat = () => {
  return (
    <div className="chat_main">
      <div className="chat_sections">
        <SideDrawer windowId={HOME_CHAT_WINDOW_ID} />
        <ChatPage windowId={HOME_CHAT_WINDOW_ID} title="Owl Bot" welcomeMessage="Hello How Are You" />
      </div>
    </div>
  );
};
