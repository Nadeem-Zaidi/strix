import { useMemo, useRef, useState } from "react";
import { BookOpen, Brain, Copy, ExternalLink, Library, RefreshCw, Search, Trash2, Wrench, X } from "lucide-react";
import { Button, Field, Toggle } from "@/shared/ui/ui";
import type { KnowledgeDocument } from "@/shared/types";
import type { AgentCatalog } from "@/features/agents/types";
import type { SkillSummary } from "@/features/skills/api/skills_api";
import type { FlowNode, FlowTraceEntry } from "@/features/pipelines/api/pipelines_api";
import type { StepNode } from "@/features/pipelines/lib/flow_graph";
import { FlowInspector } from "@/features/pipelines/components/flow_inspector";
import { webhookUrl, type Frequency, type Port, type StudioNode, type StudioProject, type TriggerConfig } from "@/features/studio/api/studio_api";
import { defaultTimezone, nodeName, PORT_LABEL, PORTS, TYPE_LABEL, type CanvasNode } from "@/features/studio/lib/studio_graph";

export type InspectorContext = {
  catalog: AgentCatalog | null;
  documents: KnowledgeDocument[];
  skills: SkillSummary[];
  project: StudioProject | null;
  savedTrigger: TriggerConfig["type"] | null;
  deliver: boolean;
  setDeliver: (v: boolean) => void;
  onRotateWebhook: () => void;
  rotating: boolean;
};

type Props = {
  node: StudioNode;
  before: CanvasNode[];                 // agents and steps that run earlier
  subs: StudioNode[];                   // what's plugged into this agent
  hostAgent: StudioNode | null;         // the agent a sub-node is plugged into
  runEntry?: FlowTraceEntry;            // this node in the run shown on the canvas
  ctx: InspectorContext;
  onChange: (node: StudioNode) => void;
  onDelete: () => void;
  onClose: () => void;
  onSelect: (id: string) => void;
  onAddSub: (port: Port) => void;
};

const SUB_ICON = { model: <Brain size={14} />, tool: <Wrench size={14} />, knowledge: <BookOpen size={14} />, skill: <Library size={14} /> };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// A textarea with buttons that insert {{input}}, {{previous}} and earlier agents' outputs.
const TokenField = ({ label, value, onChange, before, hint, rows = 3, max = 4000 }: {
  label: string; value: string; onChange: (v: string) => void; before: CanvasNode[]; hint?: string; rows?: number; max?: number;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const insert = (token: string) => {
    const el = ref.current;
    const at = el ? el.selectionStart : value.length;
    onChange(value.slice(0, at) + token + value.slice(el ? el.selectionEnd : at));
    requestAnimationFrame(() => el?.focus());
  };
  return (
    <Field label={label} hint={hint}>
      <textarea ref={ref} className="ag_input" rows={rows} value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} />
      <div className="wf_tokens">
        <button type="button" className="ag_chip ag_chip--button" onClick={() => insert("{{input}}")}>run input</button>
        <button type="button" className="ag_chip ag_chip--button" onClick={() => insert("{{previous}}")}>previous step</button>
        {before.filter((b) => b.data.node.type === "agent").map((b) => (
          <button key={b.id} type="button" className="ag_chip ag_chip--button" onClick={() => insert(`{{node.${b.id}}}`)}>{nodeName(b.data.node)}</button>
        ))}
      </div>
    </Field>
  );
};

const LastRun = ({ entry }: { entry?: FlowTraceEntry }) => {
  if (!entry || (!entry.output && !entry.error)) return null;
  return (
    <div className="as_lastrun">
      <span className="ag_muted ag_small">Last run · {entry.status}{entry.branch_label ? ` → ${entry.branch_label}` : ""}</span>
      {entry.error && <div className="ag_error">{entry.error}</div>}
      {entry.output && <pre className="ag_run__output">{entry.output}</pre>}
    </div>
  );
};

export const StudioInspector = (p: Props) => {
  const { node } = p;
  // Flow steps: exactly the Workflows inspector.
  if (node.type === "condition" || node.type === "router" || node.type === "approval" || node.type === "notify" || node.type === "end") {
    const before = p.before.filter((b) => b.data.node.type === "agent").map((b) => ({
      id: b.id, position: b.position,
      data: { node: { id: b.id, type: "agent", position: b.position, label: nodeName(b.data.node), agent_kind: "agent", agent_id: "", instruction: "" } },
    })) as unknown as StepNode[];
    return (
      <div className="as_inspector_wrap">
        <FlowInspector node={node as FlowNode} agents={[]} before={before} onChange={(n) => p.onChange(n as StudioNode)} onDelete={p.onDelete} onClose={p.onClose} />
        <LastRun entry={p.runEntry} />
      </div>
    );
  }

  return (
    <div className="wf_inspector">
      <div className="wf_inspector__head">
        <span className="ag_chip">{TYPE_LABEL[node.type]}</span>
        <button type="button" className="ag_icon_btn" aria-label="Close" onClick={p.onClose}><X size={16} /></button>
      </div>
      {node.type === "trigger" && <TriggerEditor {...p} node={node} />}
      {node.type === "agent" && <AgentEditorPanel {...p} node={node} />}
      {(node.type === "model" || node.type === "tool" || node.type === "knowledge" || node.type === "skill") && <SubEditor {...p} />}
      {node.type !== "trigger" && (
        <button type="button" className="wf_inspector__delete" onClick={p.onDelete}><Trash2 size={14} /> {node.type === "agent" ? "Remove from project" : "Delete"}</button>
      )}
      {node.type === "agent" && node.agent_id && <p className="ag_muted ag_small">Removing it here keeps the agent on the Agents page.</p>}
    </div>
  );
};

// ── trigger ──
const TriggerEditor = ({ node, onChange, ctx }: Props & { node: Extract<StudioNode, { type: "trigger" }> }) => {
  const t = node.trigger;
  const [copied, setCopied] = useState(false);
  const set = (trigger: TriggerConfig) => onChange({ ...node, trigger });
  const pick = (type: TriggerConfig["type"]) => {
    if (type === t.type) return;
    if (type === "schedule") set({ type, timing: { frequency: "daily", time_of_day: "09:00", timezone: defaultTimezone() }, input: "" });
    else if (type === "chat") set({ type, command: "" });
    else set({ type });
  };
  const url = ctx.project?.webhook_path ? webhookUrl(ctx.project.webhook_path) : null;
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      <div className="ag_field">
        <span className="ag_field__label" id="as_trigger_label">Starts when</span>
        <div className="as_trigger_pick" role="radiogroup" aria-labelledby="as_trigger_label">
          {([["manual", "I click Run"], ["schedule", "On a schedule"], ["webhook", "A webhook is called"], ["chat", "A chat command"]] as const).map(([v, l]) => (
            <label key={v} className={`sk_mode ${t.type === v ? "is_on" : ""}`}>
              <input type="radio" checked={t.type === v} onChange={() => pick(v)} /> {l}
            </label>
          ))}
        </div>
      </div>

      {t.type === "manual" && <p className="ag_muted ag_small">Type an input in the Run panel and click Run. Every project can also be run by hand, whatever its trigger.</p>}

      {t.type === "schedule" && (
        <>
          <div className="as_form2">
            <Field label="How often">
              <select className="ag_input" value={t.timing.frequency} onChange={(e) => {
                const frequency = e.target.value as Frequency;
                set({ ...t, timing: { ...t.timing, frequency, interval_hours: frequency === "hourly" ? (t.timing.interval_hours ?? 1) : null, time_of_day: frequency === "hourly" ? null : (t.timing.time_of_day ?? "09:00"), weekday: frequency === "weekly" ? (t.timing.weekday ?? 1) : null } });
              }}>
                <option value="hourly">Every few hours</option>
                <option value="daily">Every day</option>
                <option value="weekdays">Weekdays</option>
                <option value="weekly">Once a week</option>
              </select>
            </Field>
            {t.timing.frequency === "hourly" ? (
              <Field label="Every (hours)">
                <input className="ag_input" type="number" min={1} max={168} value={t.timing.interval_hours ?? 1} onChange={(e) => set({ ...t, timing: { ...t.timing, interval_hours: Number(e.target.value) } })} />
              </Field>
            ) : (
              <Field label="At">
                <input className="ag_input" type="time" value={t.timing.time_of_day ?? "09:00"} onChange={(e) => set({ ...t, timing: { ...t.timing, time_of_day: e.target.value } })} />
              </Field>
            )}
          </div>
          {t.timing.frequency === "weekly" && (
            <Field label="On">
              <select className="ag_input" value={t.timing.weekday ?? 1} onChange={(e) => set({ ...t, timing: { ...t.timing, weekday: Number(e.target.value) } })}>
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </Field>
          )}
          <Field label="Timezone"><input className="ag_input" value={t.timing.timezone} maxLength={60} onChange={(e) => set({ ...t, timing: { ...t.timing, timezone: e.target.value } })} /></Field>
          <Field label="Input for each run" hint="What the first agent receives as {{input}}.">
            <textarea className="ag_input" rows={2} value={t.input} maxLength={4000} onChange={(e) => set({ ...t, input: e.target.value })} />
          </Field>
          {ctx.project?.next_run_at && ctx.savedTrigger === "schedule" && <p className="ag_muted ag_small">Next run: {new Date(ctx.project.next_run_at).toLocaleString()}</p>}
        </>
      )}

      {t.type === "webhook" && (
        url && ctx.savedTrigger === "webhook" ? (
          <>
            <Field label="Webhook URL" hint="POST JSON or text to it — the body becomes the run's input. Keep it secret: anyone with the URL can start a run.">
              <div className="as_url">
                <code>{url}</code>
                <button type="button" className="ag_icon_btn" onClick={() => void copy()} aria-label="Copy URL">{copied ? "✓" : <Copy size={14} />}</button>
              </div>
            </Field>
            <pre className="as_code">{`curl -X POST '${url}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{"input": "Hello"}'`}</pre>
            <Button variant="ghost" onClick={ctx.onRotateWebhook} busy={ctx.rotating}><RefreshCw size={14} /> New URL (the old one stops working)</Button>
          </>
        ) : <p className="ag_muted ag_small">Save the project to get its webhook URL.</p>
      )}

      {t.type === "chat" && (
        <Field label="Command" hint="Send it in your linked WhatsApp or Telegram, followed by your text — e.g. /triage my order hasn't arrived. /flows lists your commands.">
          <div className="as_cmd"><span>/</span><input className="ag_input" value={t.command} maxLength={31} placeholder="triage"
            onChange={(e) => set({ ...t, command: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} /></div>
        </Field>
      )}

      <Toggle checked={ctx.deliver} onChange={ctx.setDeliver} label="Send the result to my WhatsApp / Telegram" />
    </>
  );
};

// ── agent ──
const AgentEditorPanel = ({ node, onChange, before, subs, onSelect, onAddSub, runEntry, ctx }: Props & { node: Extract<StudioNode, { type: "agent" }> }) => {
  const setAgent = (patch: Partial<typeof node.agent>) => onChange({ ...node, agent: { ...node.agent, ...patch } });
  const subText = (s: StudioNode) => s.type === "model" ? `${s.model || "Default model"}` : s.type === "tool" ? (ctx.catalog?.builtinTools.find((t) => t.id === s.tool)?.label ?? s.tool)
    : s.type === "knowledge" ? `${s.document_keys.length} document${s.document_keys.length === 1 ? "" : "s"}` : s.type === "skill" ? (s.skill_id === "*" ? "All skills" : ctx.skills.find((k) => k.id === s.skill_id)?.name ?? "Skill") : "";
  return (
    <>
      <div className="as_agent_row">
        <Field label="Icon"><input className="ag_input as_icon_input" value={node.agent.icon} maxLength={8} onChange={(e) => setAgent({ icon: e.target.value })} /></Field>
        <Field label="Agent name"><input className="ag_input" value={node.agent.name} maxLength={60} placeholder="e.g. Researcher" onChange={(e) => setAgent({ name: e.target.value })} /></Field>
      </div>
      <Field label="Description (optional)"><input className="ag_input" value={node.agent.description} maxLength={300} onChange={(e) => setAgent({ description: e.target.value })} /></Field>
      <Field label="Instructions" hint="Who the agent is and how it works — its system prompt.">
        <textarea className="ag_input" rows={5} value={node.agent.instructions} maxLength={20000} onChange={(e) => setAgent({ instructions: e.target.value })} />
      </Field>
      <TokenField label="Task in this project" value={node.instruction} onChange={(v) => onChange({ ...node, instruction: v })} before={before}
        hint="What it's asked at this point. Without a placeholder, the previous step's output is added at the end." />

      <div className="as_plugged">
        <span className="ag_small"><strong>Plugged in</strong></span>
        {subs.length === 0 && <span className="ag_muted ag_small">Nothing yet — uses your default model, no tools.</span>}
        {subs.map((s) => (
          <button key={s.id} type="button" className="as_plugged__item" onClick={() => onSelect(s.id)}>
            {SUB_ICON[s.type as keyof typeof SUB_ICON]} <span>{TYPE_LABEL[s.type]}: {subText(s)}</span>
          </button>
        ))}
        <div className="as_plugged__add">
          {PORTS.filter((port) => port !== "model" || !subs.some((s) => s.type === "model")).map((port) => (
            <button key={port} type="button" className="ag_chip ag_chip--button" onClick={() => onAddSub(port)}>+ {PORT_LABEL[port]}</button>
          ))}
        </div>
      </div>

      {node.agent_id
        ? <a className="as_link" href={`/agents/${node.agent_id}`} target="_blank" rel="noreferrer"><ExternalLink size={13} /> HTTP functions, MCP servers and instruction files — open on the Agents page</a>
        : <p className="ag_muted ag_small">Saving creates this as a real agent: it also appears on the Agents page and can be used in chat.</p>}
      <LastRun entry={runEntry} />
    </>
  );
};

// ── model / tool / knowledge / skill ──
const SubEditor = ({ node, onChange, hostAgent, ctx }: Props) => {
  const [q, setQ] = useState("");
  const docs = useMemo(() => ctx.documents.filter((d) => d.name.toLowerCase().includes(q.toLowerCase())), [ctx.documents, q]);
  const host = hostAgent ? nodeName(hostAgent) : null;
  return (
    <>
      <p className="ag_muted ag_small">{host ? <>Plugged into <strong>{host}</strong>.</> : "Drag from its top dot to an agent's port to plug it in."}</p>

      {node.type === "model" && (() => {
        const providers = ctx.catalog?.providers ?? [];
        const prov = providers.find((x) => x.id === node.provider);
        return (
          <>
            <Field label="Provider">
              <select className="ag_input" value={node.provider} onChange={(e) => onChange({ ...node, provider: e.target.value, model: null })}>
                {!prov && <option value={node.provider}>{node.provider ? `${node.provider} (not available)` : "Choose…"}</option>}
                {providers.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
              </select>
            </Field>
            <Field label="Model">
              <select className="ag_input" value={node.model ?? ""} onChange={(e) => onChange({ ...node, model: e.target.value || null })}>
                <option value="">Provider default{prov ? ` (${prov.defaultModel})` : ""}</option>
                {(prov?.models ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </>
        );
      })()}

      {node.type === "tool" && (
        <Field label="Tool" hint={ctx.catalog?.builtinTools.find((t) => t.id === node.tool)?.description}>
          <select className="ag_input" value={node.tool} onChange={(e) => onChange({ ...node, tool: e.target.value })}>
            {(ctx.catalog?.builtinTools ?? []).map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
      )}

      {node.type === "knowledge" && (
        <>
          <p className="ag_muted ag_small">The agent only uses these documents. Without a Knowledge node it can use all of yours. Add a knowledge tool (e.g. Search knowledge base) so it can read them.</p>
          {ctx.documents.length > 8 && <label className="ag_search"><Search size={14} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter documents" /></label>}
          <div className="as_doclist">
            {ctx.documents.length === 0 && <span className="ag_muted ag_small">Your knowledge base is empty — upload documents first.</span>}
            {docs.map((d) => (
              <label key={d.key} className="as_doc">
                <input type="checkbox" checked={node.document_keys.includes(d.key)}
                  onChange={(e) => onChange({ ...node, document_keys: e.target.checked ? [...node.document_keys, d.key] : node.document_keys.filter((k) => k !== d.key) })} />
                <span>{d.name}</span>
              </label>
            ))}
          </div>
        </>
      )}

      {node.type === "skill" && (
        <Field label="Skill" hint="The agent loads a skill's instructions when a task needs it.">
          <select className="ag_input" value={node.skill_id} onChange={(e) => onChange({ ...node, skill_id: e.target.value })}>
            <option value="*">All my skills</option>
            {ctx.skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
    </>
  );
};
