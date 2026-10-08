import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bell, CheckCircle2, CirclePlay, Flag, GitFork, LoaderCircle, PauseCircle, ShieldCheck, XCircle } from "lucide-react";
import { AgentAvatar } from "@/shared/ui/agent_avatar";
import { nodeLabel, RULE_LABEL, type StepNode } from "@/features/pipelines/lib/flow_graph";

const ICON = {
  start: <CirclePlay size={15} />, condition: <GitFork size={15} />, approval: <ShieldCheck size={15} />,
  notify: <Bell size={15} />, end: <Flag size={15} />,
};

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  if (status === "running") return <LoaderCircle size={15} className="spin wf_node__st wf_node__st--running" aria-label="running" />;
  if (status === "succeeded") return <CheckCircle2 size={15} className="wf_node__st wf_node__st--ok" aria-label="done" />;
  if (status === "waiting") return <PauseCircle size={15} className="wf_node__st wf_node__st--wait" aria-label="waiting for approval" />;
  return <XCircle size={15} className="wf_node__st wf_node__st--bad" aria-label={status} />;
};

const summary = (n: StepNode["data"]["node"], agentName?: string): string => {
  switch (n.type) {
    case "start": return "The run's input";
    case "agent": return agentName ?? "Choose an agent";
    case "condition": return n.mode === "ai" ? `Ask AI: ${n.question || "…"}` : `${n.source} ${RULE_LABEL[n.op]} ${n.value}`.trim();
    case "approval": return n.notify ? "Waits for you · notifies you" : "Waits for you";
    case "notify": return "Message to WhatsApp / Telegram";
    case "end": return "Finish with the output";
  }
};

// One step on the canvas. Branching steps have two labelled outputs.
export const StepNodeCard = memo(({ data, selected }: NodeProps<StepNode>) => {
  const n = data.node;
  return (
    <div className={`wf_node wf_node--${n.type} ${selected ? "is_selected" : ""} ${data.status ? `is_${data.status}` : ""}`}>
      {n.type !== "start" && <Handle type="target" position={Position.Top} className="wf_handle" />}
      <div className="wf_node__head">
        <span className="wf_node__icon">{n.type === "agent" ? (data.agent ? <AgentAvatar icon={data.agent.icon} /> : "❔") : ICON[n.type]}</span>
        <strong className="wf_node__title">{nodeLabel(n)}</strong>
        <StatusBadge status={data.status} />
      </div>
      <div className="wf_node__sub">{summary(n, data.agent?.name)}</div>

      {(n.type === "start" || n.type === "agent" || n.type === "notify") && <Handle type="source" position={Position.Bottom} className="wf_handle" />}
      {n.type === "condition" && (
        <>
          <Handle type="source" id="true" position={Position.Bottom} className="wf_handle wf_handle--true" style={{ left: "28%" }} />
          <Handle type="source" id="false" position={Position.Bottom} className="wf_handle wf_handle--false" style={{ left: "72%" }} />
          <div className="wf_node__outs"><span>Yes</span><span>No</span></div>
        </>
      )}
      {n.type === "approval" && (
        <>
          <Handle type="source" id="approved" position={Position.Bottom} className="wf_handle wf_handle--true" style={{ left: "28%" }} />
          <Handle type="source" id="rejected" position={Position.Bottom} className="wf_handle wf_handle--false" style={{ left: "72%" }} />
          <div className="wf_node__outs"><span>Approved</span><span>Rejected</span></div>
        </>
      )}
    </div>
  );
});
StepNodeCard.displayName = "StepNodeCard";
