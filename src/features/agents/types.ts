export type BuiltinTool = { id: string; label: string; description: string };

export type ProviderInfo = { id: string; label: string; defaultModel: string; models: string[] };

export type AgentCatalog = {
  builtinTools: BuiltinTool[];
  providers: ProviderInfo[];
  defaultProvider: string;
  // Python code functions: on when OWNER_EMAILS is set; only owners may write them.
  codeFunctions: { enabled: boolean; canWrite: boolean; email: string | null };
};

// A Markdown file attached to an agent; added to its instructions.
export type InstructionFile = { name: string; content: string; enabled: boolean };

export type Agent = {
  id: string;
  name: string;
  icon: string;
  description: string;
  instructions: string;
  provider: string | null;
  model: string | null;
  builtin_tools: string[];
  document_keys: string[];
  starters: string[];
  instruction_files: InstructionFile[];
  // Which of the owner's skills the agent may load.
  skill_mode?: "all" | "selected" | "none";
  skill_ids?: string[];
  created_at: string;
  updated_at: string;
};

export type AgentSummary = Agent & { function_count: number; mcp_count: number; code_function_count: number; schedule_count: number };

export type FunctionParam = { name: string; type: "string" | "number" | "integer" | "boolean"; description?: string; required?: boolean };
export type FunctionHeader = { key: string; value: string; secret: boolean };

export type AgentFunction = {
  id: string;
  name: string;
  description: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  parameters: FunctionParam[];
  headers: FunctionHeader[];
  enabled: boolean;
};

export type FunctionDraft = Omit<AgentFunction, "id">;

export type CodeSecret = { key: string; value: string };

// An owner-written Python function, run by the Python gRPC service.
export type CodeFunction = {
  id: string;
  name: string;
  description: string;
  code: string;
  parameters: FunctionParam[];
  secrets: CodeSecret[];
  timeout_ms: number;
  enabled: boolean;
};

export type CodeFunctionDraft = Omit<CodeFunction, "id">;

export type RunPythonResult = { ok: boolean; result?: unknown; stdout: string; error?: string; durationMs: number };

export type McpTool = { name: string; description?: string; enabled: boolean; toolName?: string };

export type McpServer = { id: string; name: string; url: string; hasToken: boolean; tools: McpTool[]; updated_at: string };

export type Frequency = "hourly" | "daily" | "weekdays" | "weekly";

export type Schedule = {
  id: string;
  name: string;
  prompt: string;
  frequency: Frequency;
  interval_hours: number | null;
  time_of_day: string | null;
  weekday: number | null;
  timezone: string;
  deliver_whatsapp: boolean;
  enabled: boolean;
  session_id: string | null;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: "running" | "succeeded" | "failed" | null;
  summary: string;
};

export type ScheduleDraft = Pick<Schedule, "name" | "prompt" | "frequency" | "interval_hours" | "time_of_day" | "weekday" | "timezone" | "deliver_whatsapp" | "enabled">;

export type AgentRun = {
  id: number;
  schedule_id: string | null;
  schedule_name: string | null;
  session_id: string | null;
  status: "running" | "succeeded" | "failed";
  output: string | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
};

export type AgentDetail = Agent & { functions: AgentFunction[]; codeFunctions: CodeFunction[]; mcpServers: McpServer[]; schedules: Schedule[] };

export type AgentInput = Pick<Agent, "name" | "icon" | "description" | "instructions" | "provider" | "model" | "builtin_tools" | "document_keys" | "starters" | "instruction_files" | "skill_mode" | "skill_ids">;

export type AgentDraft = Pick<Agent, "name" | "icon" | "description" | "instructions" | "builtin_tools" | "starters">;

export type HttpTestResult = { status: number; ok: boolean; body: unknown; durationMs: number };

export const SECRET_MASK = "••••••••";
