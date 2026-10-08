import { Outlet, Route, Routes } from "react-router-dom";
import { AppShell } from "@/app/app_shell";
import { AuthMain } from "@/features/auth/components/auth_page";
import { RequireAuth } from "@/features/auth/components/require_auth";
import { HomeChat } from "@/features/chat/components/home_chat";
import { S3FolderBrowser } from "@/features/storage/components/file_explorer";
import { AgentsPage } from "@/features/agents/components/agents_page";
import { AgentEditor } from "@/features/agents/components/agent_editor";
import { PipelinesPage } from "@/features/pipelines/components/pipelines_page";
import { PipelineEditor } from "@/features/pipelines/components/pipeline_editor";
import { WorkflowEditor } from "@/features/pipelines/components/workflow_editor";
import { NativeAgentsPage } from "@/features/native_agents/components/native_agents_page";
import { SearchPage } from "@/features/insights/components/search_page";
import { UsagePage } from "@/features/insights/components/usage_page";
import { BillingPage } from "@/features/billing/components/billing_page";
import { ApiKeysPage } from "@/features/settings/components/api_keys_page";
import { MemoryPage } from "@/features/settings/components/memory_page";
import { SkillsPage } from "@/features/skills/components/skills_page";
import { ServerSettingsPage } from "@/features/settings/components/server_settings_page";

// Everything except "/" needs a signed-in user with a verified phone.
const Protected = () => (
  <RequireAuth>
    <Outlet />
  </RequireAuth>
);

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthMain />} />
      <Route element={<Protected />}>
        <Route path="/chathome" element={<HomeChat />} />
        <Route path="/file_explorer" element={<S3FolderBrowser />} />
        <Route element={<AppShell />}>
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/agents/:id" element={<AgentEditor />} />
          <Route path="/pipelines" element={<PipelinesPage />} />
          <Route path="/pipelines/new-workflow" element={<WorkflowEditor />} />
          <Route path="/pipelines/:id" element={<PipelineEditor />} />
          <Route path="/pipelines/:id/flow" element={<WorkflowEditor />} />
          <Route path="/native-agents" element={<NativeAgentsPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/usage" element={<UsagePage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/settings/keys" element={<ApiKeysPage />} />
          <Route path="/settings/memory" element={<MemoryPage />} />
          <Route path="/skills" element={<SkillsPage />} />
          <Route path="/settings/server" element={<ServerSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
