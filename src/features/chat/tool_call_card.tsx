import { useState } from "react";

export interface ToolCallCardProps {
  name: string;
  args?: string;
  result?: string;
  done: boolean;
  source: "function" | "mcp";
  serverLabel?: string;
}

// Args/results arrive as raw JSON strings — pretty-print them when they
// parse cleanly (almost always) so the collapsed detail view reads like a
// small code block instead of one dense unbroken line.
function prettyPrint(raw?: string): string | undefined {
  if (!raw) return raw;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

const MAX_RESULT_CHARS = 800;

const ICON_BY_STATE: Record<string, string> = {
  done: "ti-check",
  mcp: "ti-plug",
  function: "ti-math-function",
};

// Previously the card dumped the raw args string and raw result string
// concatenated on one line, always visible, with no way to hide it — for
// tools like search_knowledge_base that return a few KB of JSON, that
// meant a wall of unformatted text sitting permanently in the chat. This
// mirrors CodeInterpreterCard's pattern instead: a compact header that's
// all you see by default, with the raw detail tucked behind a chevron for
// whenever someone actually wants to inspect it.
export const ToolCallCard = ({ name, args, result, done, source, serverLabel }: ToolCallCardProps) => {
  const [expanded, setExpanded] = useState(false);

  const prettyArgs = prettyPrint(args);
  const hasArgs = Boolean(prettyArgs && prettyArgs !== "{}");

  const prettyResultFull = done ? prettyPrint(result) : undefined;
  const prettyResult =
    prettyResultFull && prettyResultFull.length > MAX_RESULT_CHARS
      ? `${prettyResultFull.slice(0, MAX_RESULT_CHARS)}…`
      : prettyResultFull;
  const hasResult = Boolean(prettyResult);

  const hasBody = hasArgs || hasResult;
  const iconClass = done ? ICON_BY_STATE.done : ICON_BY_STATE[source];

  return (
    <div className={`tool-card ${done ? "done" : ""} ${source === "mcp" ? "mcp-tool" : ""}`}>
      <button
        type="button"
        className="tool-card__header"
        onClick={() => hasBody && setExpanded((v) => !v)}
        aria-expanded={expanded}
        disabled={!hasBody}
      >
        <div className={`tool-icon-wrap ${done ? "done" : ""}`}>
          <i className={`ti ${iconClass}`} aria-hidden="true" />
        </div>

        <div className="tool-card__text">
          <div className="tool-card__title">
            <span className="tool-card__name">{name}</span>
            {source === "mcp" && (
              <span className="mcp-badge">MCP{serverLabel ? ` · ${serverLabel}` : ""}</span>
            )}
          </div>
          <div className="tool-card__status">
            <span className={`tool-status-dot ${done ? "done" : ""}`} />
            {done ? "Done" : source === "mcp" ? "Calling remote server…" : "Running…"}
          </div>
        </div>

        {hasBody && <span className="tool-card__chevron">{expanded ? "▾" : "▸"}</span>}
      </button>

      {expanded && hasBody && (
        <div className="tool-card__body">
          {hasArgs && (
            <pre className="tool-card__block">
              <code>{prettyArgs}</code>
            </pre>
          )}
          {hasResult && (
            <pre className="tool-card__block tool-card__block--result">
              <code>{prettyResult}</code>
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
