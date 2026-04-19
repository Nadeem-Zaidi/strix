import "../global/chat.css";

export const Chat_UI = () => {
    return (
        <div className="chat_main">
            <div className="chat_topbar">
                <h4>Owl Bot</h4>
            </div>
            <div className="chat_sections">
                <div className="chat_sidebar">
                    <h4>Hello</h4>
                </div>
                <div className="chat_plane">
                    <div className="page">
                        <div className="message_area">
                        <div className="message user_message">First</div>
                        <div className="message bot_message">What</div>
                    </div>

                    </div>
                    
                    <div className="chat_input_wrapper">
                        <div className="chat_input">
                            <span>Ask anything...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}