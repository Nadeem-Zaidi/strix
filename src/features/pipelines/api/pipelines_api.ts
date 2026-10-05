import { BaseApi } from "@/shared/api/base_fetch";

// kind "native" = a provider agent (Claude / OpenAI); missing means a regular agent.
export type PipelineStep = { kind?: "agent" | "native"; agent_id: string; instruction: string };

export type Pipeline = {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
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
  status: "running" | "succeeded" | "failed";
  input: string;
  steps: PipelineRunStep[];
  output: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type PipelineDetail = Pipeline & { runs: PipelineRun[] };
export type PipelineInput = Pick<Pipeline, "name" | "description" | "steps">;

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
}

export const pipelinesApi = new PipelinesApi();
