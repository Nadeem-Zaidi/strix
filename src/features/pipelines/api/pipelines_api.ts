import { BaseApi } from "@/shared/api/base_fetch";

// kind "native" = a provider agent (Claude / OpenAI); missing means a regular agent.
export type PipelineStep = { kind?: "agent" | "native"; agent_id: string; instruction: string };

// ── workflows (backend core/flows/flow_types.ts) ──
export type RuleOp = "contains" | "not_contains" | "equals" | "matches" | "number_gt" | "number_gte" | "number_lt" | "number_lte" | "is_empty" | "not_empty";
export type Position = { x: number; y: number };
export type FlowNode =
  | { id: string; type: "start"; position: Position; label?: string }
  | { id: string; type: "agent"; position: Position; label?: string; agent_kind: "agent" | "native"; agent_id: string; instruction: string }
  | { id: string; type: "condition"; position: Position; label?: string; mode: "rule"; source: string; op: RuleOp; value: string }
  | { id: string; type: "condition"; position: Position; label?: string; mode: "ai"; source: string; question: string }
  | { id: string; type: "approval"; position: Position; label?: string; message: string; notify: boolean }
  | { id: string; type: "notify"; position: Position; label?: string; message: string }
  | { id: string; type: "end"; position: Position; label?: string; output: string };
export type NodeType = FlowNode["type"];
export type Branch = "true" | "false" | "approved" | "rejected";
export type FlowEdge = { id: string; from: string; to: string; branch?: Branch };
export type Flow = { version: 1; nodes: FlowNode[]; edges: FlowEdge[] };

export type FlowTraceEntry = {
  node_id: string;
  type: NodeType;
  label: string;
  status: "running" | "succeeded" | "failed" | "waiting" | "rejected" | "skipped";
  kind?: "agent" | "native";
  agent_name?: string;
  agent_icon?: string;
  output?: string;
  error?: string;
  branch?: Branch;
  decided_by?: string;
  comment?: string;
  started_at?: string;
  finished_at?: string;
};

export type Pipeline = {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  // Set for workflows; null for linear pipelines.
  flow?: Flow | null;
  created_at: string;
  updated_at: string;
};

export type PipelineSummary = Pipeline & { last_run_status: PipelineRun["status"] | null; last_run_at: string | null };

export type StepRunStatus = "pending" | "running" | "succeeded" | "failed" | "skipped";

export type PipelineRunStep = {
  kind?: "agent" | "native";
  provider?: "anthropic" | "openai";
  agent_id: string;
  agent_name: string;
  agent_icon: string;
  status: StepRunStatus;
  prompt?: string;
  output?: string;
  error?: string;
  started_at?: string;
  finished_at?: string;
};

export type PipelineRun = {
  id: number;
  pipeline_id: string;
  status: "running" | "waiting" | "succeeded" | "failed" | "rejected" | "cancelled";
  input: string;
  // Linear pipelines: one entry per step. Workflows: FlowTraceEntry[].
  steps: PipelineRunStep[];
  output: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type PipelineDetail = Pipeline & { flow: Flow; is_workflow: boolean; runs: PipelineRun[] };
export type PipelineInput = Pick<Pipeline, "name" | "description" | "steps">;
export type WorkflowInput = { name: string; description: string; flow: Flow };
export type WaitingRun = PipelineRun & { pipeline_name: string };

// Client for /api/pipelines (backend routes/pipeline_routes.ts).
class PipelinesApi extends BaseApi {
  constructor() {
    super(import.meta.env.VITE_API_URL);
  }

  async list() { return (await this.get<{ pipelines: PipelineSummary[] }>("/pipelines")).pipelines; }
  getPipeline(id: string) { return this.get<PipelineDetail>(`/pipelines/${id}`); }
  create(input: PipelineInput) { return this.post<Pipeline>("/pipelines", input); }
  update(id: string, input: PipelineInput) { return this.put<Pipeline>(`/pipelines/${id}`, input); }
  remove(id: string) { return this.delete<void>(`/pipelines/${id}`); }
  run(id: string, input: string) { return this.post<PipelineRun>(`/pipelines/${id}/run`, { input }); }
  getRun(runId: number) { return this.get<PipelineRun>(`/pipelines/runs/${runId}`); }
  createWorkflow(input: WorkflowInput) { return this.post<Pipeline>("/pipelines", input); }
  updateWorkflow(id: string, input: WorkflowInput) { return this.put<Pipeline>(`/pipelines/${id}`, input); }
  async approvals() { return (await this.get<{ runs: WaitingRun[] }>("/pipelines/approvals")).runs; }
  decide(runId: number, approved: boolean, comment?: string) { return this.post<{ status: string }>(`/pipelines/runs/${runId}/decision`, { approved, comment }); }
  cancel(runId: number) { return this.post<{ status: string }>(`/pipelines/runs/${runId}/cancel`, {}); }
}

export const pipelinesApi = new PipelinesApi();
