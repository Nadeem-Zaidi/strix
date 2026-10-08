import type { Edge, Node } from "@xyflow/react";
import type { Branch, Flow, FlowNode, FlowTraceEntry, NodeType } from "@/features/pipelines/api/pipelines_api";
import type { StepAgent } from "@/features/pipelines/api/pipeline_agents";

// The workflow editor works on React Flow nodes/edges; the server stores a
// Flow. These convert between the two and hold the small helpers the editor
// components share.

export type RunStatus = FlowTraceEntry["status"];
export type StepNodeData = { node: FlowNode; status?: RunStatus; agent?: StepAgent };
export type StepNode = Node<StepNodeData>;

export const TYPE_LABEL: Record<NodeType, string> = {
  start: "Start", agent: "Agent", condition: "Condition", approval: "Approval", notify: "Notify", end: "End",
};

export const BRANCH_LABEL: Record<Branch, string> = { true: "Yes", false: "No", approved: "Approved", rejected: "Rejected" };

export const RULE_LABEL: Record<string, string> = {
  contains: "contains", not_contains: "doesn't contain", equals: "equals", matches: "matches pattern",
  number_gt: "number >", number_gte: "number ≥", number_lt: "number <", number_lte: "number ≤",
  is_empty: "is empty", not_empty: "isn't empty",
};

export const nodeLabel = (n: FlowNode) => n.label || TYPE_LABEL[n.type];

export function toGraph(flow: Flow): { nodes: StepNode[]; edges: Edge[] } {
  return {
    nodes: flow.nodes.map((n) => ({ id: n.id, type: "step", position: n.position, data: { node: n }, deletable: n.type !== "start" })),
    edges: flow.edges.map(toEdge),
  };
}

export function toEdge(e: { id: string; from: string; to: string; branch?: Branch }): Edge {
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    sourceHandle: e.branch ?? null,
    label: e.branch ? BRANCH_LABEL[e.branch] : undefined,
    className: e.branch ? `wf_edge wf_edge--${e.branch}` : "wf_edge",
  };
}

export function toFlow(nodes: StepNode[], edges: Edge[]): Flow {
  return {
    version: 1,
    nodes: nodes.map((n) => ({ ...n.data.node, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) } })),
    edges: edges.map((e) => ({ id: e.id, from: e.source, to: e.target, ...(e.sourceHandle ? { branch: e.sourceHandle as Branch } : {}) })),
  };
}

const newId = (type: NodeType) => `${type}_${Math.random().toString(36).slice(2, 7)}`;

export function newNode(type: NodeType, position: { x: number; y: number }, agent?: StepAgent): FlowNode {
  const id = newId(type);
  switch (type) {
    case "agent":
      return { id, type, position, agent_kind: agent?.kind ?? "agent", agent_id: agent?.id ?? "", instruction: "{{previous}}" };
    case "condition":
      return { id, type, position, mode: "rule", source: "previous", op: "contains", value: "" };
    case "approval":
      return { id, type, position, message: "Approve to continue?\n\n{{previous}}", notify: true };
    case "notify":
      return { id, type, position, message: "{{previous}}" };
    case "end":
      return { id, type, position, output: "{{previous}}" };
    default:
      return { id, type: "start", position };
  }
}

// New workflow: Start → (first agent) → End.
export function starterFlow(agent?: StepAgent): Flow {
  const start: FlowNode = { id: "start", type: "start", position: { x: 0, y: 0 } };
  const end: FlowNode = { id: "end", type: "end", position: { x: 0, y: agent ? 300 : 160 }, output: "{{previous}}" };
  if (!agent) return { version: 1, nodes: [start, end], edges: [{ id: "start-end", from: "start", to: "end" }] };
  const a: FlowNode = { id: "agent_1", type: "agent", position: { x: 0, y: 150 }, agent_kind: agent.kind, agent_id: agent.id, instruction: "{{input}}" };
  return { version: 1, nodes: [start, a, end], edges: [{ id: "start-agent_1", from: "start", to: "agent_1" }, { id: "agent_1-end", from: "agent_1", to: "end" }] };
}

// Steps that run before `id` (for {{node.<id>}} buttons and condition sources).
export function upstream(id: string, nodes: StepNode[], edges: Edge[]): StepNode[] {
  const before = new Set<string>();
  const walk = (to: string) => {
    for (const e of edges) if (e.target === to && !before.has(e.source)) { before.add(e.source); walk(e.source); }
  };
  walk(id);
  return nodes.filter((n) => before.has(n.id) && n.data.node.type !== "start");
}

// Latest status of each node in a workflow run.
export function statusByNode(trace: FlowTraceEntry[] | undefined): Map<string, RunStatus> {
  const m = new Map<string, RunStatus>();
  for (const t of trace ?? []) m.set(t.node_id, t.status);
  return m;
}

export const isTrace = (steps: unknown[]): steps is FlowTraceEntry[] => steps.every((s) => typeof s === "object" && s !== null && "node_id" in s);
