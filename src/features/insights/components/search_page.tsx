import { useEffect, useMemo, useRef, useState } from "react";
import { AgentAvatar } from "@/shared/ui/agent_avatar";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { LoaderCircle, MessageSquare, Search, X } from "lucide-react";
import { useAppSelector } from "@/app/store";
import { insightsApi, type SearchResult } from "@/features/insights/api/insights_api";

const relative = (iso: string) => {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 30 * 86400) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

// Wraps every case-insensitive occurrence of `query` in <mark>.
const Highlight = ({ text, query }: { text: string; query: string }) => {
  if (!query) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return <>{parts.map((p, i) => (p.toLowerCase() === query.toLowerCase() ? <mark key={i}>{p}</mark> : <span key={i}>{p}</span>))}</>;
};

const SourceBadge = ({ r }: { r: Pick<SearchResult, "source" | "agent_icon" | "agent_name"> }) => (
  <>
    {r.agent_icon && <span className="srch_badge" title={r.agent_name ?? "Agent"}><AgentAvatar icon={r.agent_icon} /> {r.agent_name}</span>}
    {r.source === "whatsapp" && <span className="srch_badge srch_badge--wa"><FontAwesomeIcon icon={faWhatsapp} /> WhatsApp</span>}
  </>
);

export const SearchPage = () => {
  const navigate = useNavigate();
  const sessions = useAppSelector((s) => s.session.sessions);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = query.trim();

  useEffect(() => inputRef.current?.focus(), []);

  // Search 300 ms after the user stops typing; ignore stale responses.
  useEffect(() => {
    if (trimmed.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const r = await insightsApi.searchChats(trimmed);
        if (!cancelled) { setResults(r); setActive(0); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [trimmed]);

  const shown = trimmed.length >= 2 ? results : null;
  const recent = useMemo(() => sessions.slice(0, 8), [sessions]);
  const open = (sessionId: string) => navigate(`/chathome?session=${sessionId}`);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!shown?.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(shown.length - 1, i + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    if (e.key === "Enter") { e.preventDefault(); open(shown[active].session_id); }
  };

  return (
    <div className="ag_page srch_page">
      <h1 className="ag_page__title">Search chats</h1>
      <p className="ag_page__subtitle">Find any conversation by its title or by something said in it.</p>

      <label className="srch_box">
        <Search size={18} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search your chats…"
          aria-label="Search chats"
        />
        {loading && <LoaderCircle size={16} className="spin srch_box__spin" />}
        {query && <button type="button" className="ag_icon_btn" aria-label="Clear search" onClick={() => { setQuery(""); setResults(null); inputRef.current?.focus(); }}><X size={16} /></button>}
      </label>
      <p className="srch_hint ag_muted ag_small">Tip: press <kbd>Ctrl</kbd> + <kbd>K</kbd> anywhere to open search · <kbd>↑</kbd><kbd>↓</kbd> to move · <kbd>Enter</kbd> to open</p>

      {error && <div className="ag_error">{error}</div>}

      {shown && (
        <>
          <p className="ag_muted ag_small srch_count">
            {shown.length === 0 ? `No chats match “${trimmed}”.` : `${shown.length} chat${shown.length === 1 ? "" : "s"} match “${trimmed}”`}
          </p>
          <ul className="srch_results" role="listbox">
            {shown.map((r, i) => (
              <li key={r.session_id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  className={`srch_result ${i === active ? "is_active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => open(r.session_id)}
                >
                  <div className="srch_result__head">
                    <MessageSquare size={15} className="srch_result__icon" />
                    <strong className="srch_result__title"><Highlight text={r.title || "New Chat"} query={trimmed} /></strong>
                    <SourceBadge r={r} />
                    <span className="ag_muted ag_small srch_result__when">{relative(r.updated_at)}</span>
                  </div>
                  {r.snippets.map((s, j) => (
                    <p key={j} className="srch_snippet">
                      <span className="srch_snippet__who">{s.role === "user" ? "You" : "Owl Bot"}:</span> <Highlight text={s.text} query={trimmed} />
                    </p>
                  ))}
                  {r.match_count > r.snippets.length && <span className="ag_muted ag_small srch_more">+{r.match_count - r.snippets.length} more match{r.match_count - r.snippets.length === 1 ? "" : "es"} in this chat</span>}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {!shown && (
        <section className="srch_recent">
          <span className="ag_field__label">Recent chats</span>
          {recent.length === 0 && <p className="ag_muted ag_small">No chats yet.</p>}
          <ul className="srch_results">
            {recent.map((s) => (
              <li key={s.id}>
                <button type="button" className="srch_result srch_result--compact" onClick={() => open(s.id)}>
                  <div className="srch_result__head">
                    <MessageSquare size={15} className="srch_result__icon" />
                    <strong className="srch_result__title">{s.title || "New Chat"}</strong>
                    <SourceBadge r={{ source: s.source ?? null, agent_icon: s.agent_icon ?? null, agent_name: s.agent_name ?? null }} />
                    <span className="ag_muted ag_small srch_result__when">{relative(s.updated_at)}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
