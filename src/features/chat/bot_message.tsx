// // components/BotMessage.tsx
// import ReactMarkdown from "react-markdown";
// import remarkGfm from "remark-gfm";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// type Props = {
//     text: string;
//     isStreaming?: boolean;
//     cancelled?: boolean;
// };

// export const BotMessage = ({ text, isStreaming, cancelled }: Props) => {
//     return (
//         <div className="message bot_message">
//             <ReactMarkdown
//                 remarkPlugins={[remarkGfm]}
//                 components={{
//                     // code blocks
//                     code({ node, className, children, ...props }) {
//                         const isBlock = className?.includes("language-");
//                         return isBlock ? (
//                             <div className="code_block_wrapper">
//                                 <span className="code_lang">
//                                     {className?.replace("language-", "") ?? "code"}
//                                 </span>
//                                 <pre>
//                                     <code className={className} {...props}>
//                                         {children}
//                                     </code>
//                                 </pre>
//                             </div>
//                         ) : (
//                             <code className="inline_code" {...props}>
//                                 {children}
//                             </code>
//                         );
//                     },
//                     // open links in new tab
//                     a({ children, href }) {
//                         return (
//                             <a href={href} target="_blank" rel="noreferrer">
//                                 {children}
//                             </a>
//                         );
//                     }
//                 }}
//             >
//                 {text}
//             </ReactMarkdown>

//             {isStreaming && <span className="cursor">▋</span>}
//             {cancelled && <span className="cancelled_label"> ⚠ Response stopped</span>}
//         </div>
//     );
// };

type BotMessageProps = {
    text: string;
    isStreaming?: boolean;
    cancelled?: boolean;
};

export const BotMessage = ({ text, isStreaming, cancelled }: BotMessageProps) => (
    <div className="message bot_message">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ className, children, ...props }) {
                    const isBlock = className?.includes("language-");
                    const [copied, setCopied] = useState(false);
                    const handleCopy = () => {
                        navigator.clipboard.writeText(
                            String(children).replace(/\n$/, "")
                        );
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    };
                    return isBlock ? (
                        <div className="code_block_wrapper">
                            <div className="code_header">
                                <span className="code_lang">
                                    {className?.replace("language-", "") ??
                                        "code"}
                                </span>
                                <button
                                    className="copy_btn"
                                    onClick={handleCopy}
                                >
                                    {copied ? "✅ Copied" : "Copy"}
                                </button>
                            </div>
                            <pre>
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </pre>
                        </div>
                    ) : (
                        <code className="inline_code" {...props}>
                            {children}
                        </code>
                    );
                },
                a({ children, href }) {
                    return (
                        <a href={href} target="_blank" rel="noreferrer">
                            {children}
                        </a>
                    );
                },
                // Tables come back from the model as plain GFM markdown
                // (remark-gfm parses the pipe syntax), but ReactMarkdown's
                // default table/thead/tr/th/td elements carry no classes —
                // they were rendering as bare, unstyled HTML tables even
                // though chat.css already has a full "MARKDOWN TABLES"
                // theme (.table_wrapper/.md_table/.md_thead/.md_th/.md_td)
                // waiting to be used. Wiring these up is what actually
                // makes generated tables look designed instead of raw.
                table({ children }) {
                    return (
                        <div className="table_wrapper">
                            <table className="md_table">{children}</table>
                        </div>
                    );
                },
                thead({ children }) {
                    return <thead className="md_thead">{children}</thead>;
                },
                tr({ children }) {
                    return <tr className="md_tr">{children}</tr>;
                },
                th({ children }) {
                    return <th className="md_th">{children}</th>;
                },
                td({ children }) {
                    return <td className="md_td">{children}</td>;
                },
                hr() {
                    return <hr className="bot_message_hr" />;
                },
            }}
        >
            {text}
        </ReactMarkdown>
        {isStreaming && <span className="cursor">▋</span>}
        {cancelled && (
            <span className="cancelled_label">⚠ Response stopped</span>
        )}
    </div>
);