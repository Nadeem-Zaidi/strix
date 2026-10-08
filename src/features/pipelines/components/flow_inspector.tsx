import { useRef } from "react";
import { Trash2, X } from "lucide-react";
import { Field, Toggle } from "@/shared/ui/ui";
import type { FlowNode, RuleOp } from "@/features/pipelines/api/pipelines_api";
import { providerLabel, stepKey, type StepAgent } from "@/features/pipelines/api/pipeline_agents";
import { nodeLabel, RULE_LABEL, TYPE_LABEL, type StepNode } from "@/features/pipelines/lib/flow_graph";

type Props = {
  node: FlowNode;
  agents: StepAgent[];
  before: StepNode[];           // steps that run earlier (for {{node.id}})
  onChange: (node: FlowNode) => void;
  onDelete: () => void;
  onClose: () => void;
};

const OPS: RuleOp[] = ["contains", "not_contains", "equals", "matches", "number_gt", "number_gte", "number_lt", "number_lte", "is_empty", "not_empty"];

// A textarea with buttons that insert {{input}}, {{previous}} and earlier steps' outputs.
const TemplateField = ({ label, value, onChange, before, rows = 4, hint, max = 4000 }: {
  label: string; value: string; onChange: (v: string) => void; before: StepNode[]; rows?: number; hint?: string; max?: number;
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
          <button key={b.id} type="button" className="ag_chip ag_chip--button" onClick={() => insert(`{{node.${b.id}}}`)}>{nodeLabel(b.data.node)}</button>
        ))}
      </div>
    </Field>
  );
};

export const FlowInspector = ({ node, agents, before, onChange, onDelete, onClose }: Props) => {
  const patch = (p: Partial<FlowNode>) => onChange({ ...node, ...p } as FlowNode);
  const regular = agents.filter((a) => a.kind === "agent");
  const native = agents.filter((a) => a.kind === "native");

  return (
    <div className="wf_inspector">
      <div className="wf_inspector__head">
        <span className="ag_chip">{TYPE_LABEL[node.type]}</span>
        <button type="button" className="ag_icon_btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
      </div>
      <Field label="Step name">
        <input className="ag_input" value={node.label ?? ""} maxLength={60} placeholder={TYPE_LABEL[node.type]} onChange={(e) => patch({ label: e.target.value || undefined })} />
      </Field>

      {node.type === "start" && <p className="ag_muted ag_small">Where every run begins. Its output is the input you type when you run the workflow — use <code>{"{{input}}"}</code> anywhere.</p>}

      {node.type === "agent" && (
        <>
          <Field label="Agent">
            <select className="ag_input" value={stepKey({ kind: node.agent_kind, agent_id: node.agent_id })}
              onChange={(e) => { const [kind, ...rest] = e.target.value.split(":"); patch({ agent_kind: kind as "agent" | "native", agent_id: rest.join(":") }); }}>
              {!agents.some((a) => a.id === node.agent_id) && <option value={stepKey({ kind: node.agent_kind, agent_id: node.agent_id })}>Choose an agent…</option>}
              {regular.length > 0 && <optgroup label="Agents">{regular.map((a) => <option key={a.id} value={`agent:${a.id}`}>{a.icon} {a.name}</option>)}</optgroup>}
              {native.length > 0 && (
                <optgroup label="Provider agents">
                  {native.map((a) => <option key={a.id} value={`native:${a.id}`} disabled={!a.active}>{a.icon} {a.name} · {providerLabel(a.provider)}{a.active ? "" : " (switched off)"}</option>)}
                </optgroup>
              )}
            </select>
          </Field>
          <TemplateField label="Task" value={node.instruction} onChange={(v) => patch({ instruction: v })} before={before}
            hint="Without any placeholder, the previous step's output is added at the end." />
        </>
      )}

      {node.type === "condition" && (
        <>
          <div className="sk_modes" role="radiogroup" aria-label="Condition type">
            <label className={`sk_mode ${node.mode === "rule" ? "is_on" : ""}`}>
              <input type="radio" checked={node.mode === "rule"} onChange={() => onChange({ id: node.id, type: "condition", position: node.position, label: node.label, mode: "rule", source: node.source, op: "contains", value: "" })} /> Rule
            </label>
            <label className={`sk_mode ${node.mode === "ai" ? "is_on" : ""}`}>
              <input type="radio" checked={node.mode === "ai"} onChange={() => onChange({ id: node.id, type: "condition", position: node.position, label: node.label, mode: "ai", source: node.source, question: "" })} /> Ask AI (yes/no)
            </label>
          </div>
          <Field label="Look at">
            <select className="ag_input" value={node.source} onChange={(e) => patch({ source: e.target.value })}>
              <option value="previous">Previous step's output</option>
              <option value="input">The run's input</option>
              {before.filter((b) => b.data.node.type === "agent").map((b) => <option key={b.id} value={`node.${b.id}`}>Output of “{nodeLabel(b.data.node)}”</option>)}
            </select>
          </Field>
          {node.mode === "rule" ? (
            <div className="wf_rule">
              <select className="ag_input" value={node.op} onChange={(e) => patch({ op: e.target.value as RuleOp })}>
                {OPS.map((op) => <option key={op} value={op}>{RULE_LABEL[op]}</option>)}
              </select>
              {!["is_empty", "not_empty"].includes(node.op) && (
                <input className="ag_input" value={node.value} maxLength={500} placeholder={node.op.startsWith("number") ? "50000" : node.op === "matches" ? "INV-\\d+" : "urgent"} onChange={(e) => patch({ value: e.target.value })} />
              )}
            </div>
          ) : (
            <Field label="Question" hint="Answered YES or NO by your default model.">
              <input className="ag_input" value={node.question} maxLength={500} placeholder="Is the invoice amount over ₹50,000?" onChange={(e) => patch({ question: e.target.value })} />
            </Field>
          )}
          {node.mode === "rule" && node.op.startsWith("number") && (
            <p className="ag_muted ag_small">Uses the first amount with a currency (₹62,000, $1,500), otherwise the first plain number — ids like INV-7 are skipped.</p>
          )}
          <p className="ag_muted ag_small">Connect the <strong>Yes</strong> and <strong>No</strong> outputs to the next steps.</p>
        </>
      )}

      {node.type === "approval" && (
        <>
          <TemplateField label="What to ask" value={node.message} onChange={(v) => patch({ message: v })} before={before} max={2000}
            hint="Shown on the run with Approve / Reject. The run pauses here — even for days." />
          <Toggle checked={node.notify} onChange={(v) => patch({ notify: v })} label={node.notify ? "Notify me on WhatsApp / Telegram" : "Don't notify"} />
          <p className="ag_muted ag_small">Connect <strong>Approved</strong> (required) and <strong>Rejected</strong> (optional — without it, a rejection ends the run).</p>
        </>
      )}

      {node.type === "notify" && (
        <TemplateField label="Message" value={node.message} onChange={(v) => patch({ message: v })} before={before} max={2000}
          hint="Sent to your linked WhatsApp, or Telegram if WhatsApp isn't linked." />
      )}

      {node.type === "end" && (
        <TemplateField label="Final output" value={node.output} onChange={(v) => patch({ output: v })} before={before} rows={3} max={2000} />
      )}

      {node.type !== "start" && (
        <button type="button" className="wf_inspector__delete" onClick={onDelete}><Trash2 size={14} /> Delete step</button>
      )}
    </div>
  );
};
