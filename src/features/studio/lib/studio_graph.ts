import type { Edge, Node } from "@xyflow/react";
import type { FlowTraceEntry } from "@/features/pipelines/api/pipelines_api";
import { newNode as newFlowNode } from "@/features/pipelines/lib/flow_graph";
import type { Port, StudioCanvas, StudioEdge, StudioNode, StudioNodeType, SubType } from "@/features/studio/api/studio_api";

// The Studio canvas runs left → right. Agents take sub-nodes (model, tools,
// knowledge, skills) on ports along their bottom edge, like n8n.

export type RunStatus = FlowTraceEntry["status"];
export type CanvasData = { node: StudioNode; status?: RunStatus; subs?: StudioNode[]; onAdd?: (port: Port) => void; labels?: Record<string, string> };
export type CanvasNode = Node<CanvasData>;

export const SUB_PORT: Record<SubType, Port> = { model: "model", tool: "tools", knowledge: "knowledge", skill: "skills" };
export const PORT_SUB: Record<Port, SubType> = { model: "model", tools: "tool", knowledge: "knowledge", skills: "skill" };
export const PORT_LABEL: Record<Port, string> = { model: "Model", tools: "Tools", knowledge: "Knowledge", skills: "Skills" };
export const PORTS: Port[] = ["model", "tools", "knowledge", "skills"];

export const TYPE_LABEL: Record<StudioNodeType, string> = {
  trigger: "Trigger", agent: "Agent", model: "Model", tool: "Tool", knowledge: "Knowledge", skill: "Skill",
  condition: "Condition", router: "Router", approval: "Approval", notify: "Notify", end: "End",
};

export const isSub = (n: StudioNode): n is Extract<StudioNode, { type: SubType }> =>
  n.type === "model" || n.type === "tool" || n.type === "knowledge" || n.type === "skill";

const kindOf = (n: StudioNode) => (n.type === "trigger" ? "trigger" : n.type === "agent" ? "agent" : isSub(n) ? "sub" : "step");

export const nodeName = (n: StudioNode): string =>
  n.type === "agent" ? n.label || n.agent.name || "Agent" : ("label" in n && n.label) || TYPE_LABEL[n.type];

export function toGraph(canvas: StudioCanvas): { nodes: CanvasNode[]; edges: Edge[] } {
  return {
    nodes: canvas.nodes.map((n) => ({ id: n.id, type: kindOf(n), position: n.position, data: { node: n }, deletable: n.type !== "trigger" })),
    edges: canvas.edges.map(toEdge),
  };
}

export function toEdge(e: StudioEdge): Edge {
  if (e.port) {
    return { id: e.id, source: e.from, target: e.to, sourceHandle: "plug", targetHandle: e.port, className: "as_edge as_edge--sub", data: { port: e.port } };
  }
  return {
    id: e.id, source: e.from, target: e.to, sourceHandle: e.branch ?? null, targetHandle: "in",
    className: `as_edge ${e.branch ? `wf_edge--${e.branch.startsWith("route:") ? "route" : e.branch}` : ""}`,
  };
}

export function toCanvas(nodes: CanvasNode[], edges: Edge[]): StudioCanvas {
  return {
    version: 1,
    nodes: nodes.map((n) => ({ ...n.data.node, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) } })),
    edges: edges.map((e) => (e.targetHandle && e.targetHandle !== "in"
      ? { id: e.id, from: e.source, to: e.target, port: e.targetHandle as Port }
      : { id: e.id, from: e.source, to: e.target, ...(e.sourceHandle ? { branch: e.sourceHandle as StudioEdge["branch"] } : {}) })),
  };
}

export const newId = (type: string) => `${type}_${Math.random().toString(36).slice(2, 8)}`;

export function newStudioNode(type: StudioNodeType, position: { x: number; y: number }, opts: { provider?: string; model?: string | null; tool?: string } = {}): StudioNode {
  const id = newId(type);
  switch (type) {
    case "agent":
      return { id, type, position, agent_id: null, instruction: "{{previous}}", agent: { name: "", icon: "🤖", description: "", instructions: "" } };
    case "model":
      return { id, type, position, provider: opts.provider ?? "", model: opts.model ?? null };
    case "tool":
      return { id, type, position, tool: opts.tool ?? "current_datetime" };
    case "knowledge":
      return { id, type, position, document_keys: [] };
    case "skill":
      return { id, type, position, skill_id: "*" };
    case "trigger":
      return { id, type, position, trigger: { type: "manual" } };
    default: {
      // Steps are the same as in Workflows, with a Studio id.
      const step = newFlowNode(type, position);
      return { ...step, id } as StudioNode;
    }
  }
}

// Agent names must be unique within a project ("Writer", "Writer 2", …).
export function uniqueAgentName(nodes: StudioNode[], base = "Agent"): string {
  const taken = new Set(nodes.flatMap((n) => (n.type === "agent" ? [n.agent.name.trim().toLowerCase()] : [])));
  if (!taken.has(base.toLowerCase())) return base;
  let i = 2;
  while (taken.has(`${base} ${i}`.toLowerCase())) i++;
  return `${base} ${i}`;
}

// Sub-nodes plugged into an agent.
export function subsOf(agentId: string, nodes: StudioNode[], edges: Edge[]): StudioNode[] {
  const ids = new Set(edges.filter((e) => e.target === agentId && e.targetHandle && e.targetHandle !== "in").map((e) => e.source));
  return nodes.filter((n) => ids.has(n.id));
}

// Agents and steps that run before `id` (main edges only).
export function upstream(id: string, nodes: CanvasNode[], edges: Edge[]): CanvasNode[] {
  const before = new Set<string>();
  const main = edges.filter((e) => !e.targetHandle || e.targetHandle === "in");
  const walk = (to: string) => {
    for (const e of main) if (e.target === to && !before.has(e.source)) { before.add(e.source); walk(e.source); }
  };
  walk(id);
  return nodes.filter((n) => before.has(n.id));
}

export function traceByNode(trace: FlowTraceEntry[] | undefined): Map<string, FlowTraceEntry> {
  const m = new Map<string, FlowTraceEntry>();
  for (const t of trace ?? []) m.set(t.node_id, t);
  return m;
}

export const defaultTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};
