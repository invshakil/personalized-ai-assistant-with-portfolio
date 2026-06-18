// Typed client for AI provider configuration. Components call these, not fetch().
// (The chat stream itself stays on native fetch — see AiAssistantPage.)
import { apiGet, apiPut, apiPost, apiPatch, apiDelete } from "./client";
import type {
  AiProviderId,
  ProviderConfigView,
  ProviderTestResult,
  ChatSessionSummary,
  ChatSessionDetail,
  BudgetInput,
  UsageSummary,
  CommitResult,
} from "@/services/ai/types";

export interface SaveProviderBody {
  provider: AiProviderId;
  defaultModel?: string;
  apiKey?: string | null;
  baseUrl?: string | null;
  enabled?: boolean;
  setActive?: boolean;
}

export const aiApi = {
  listProviders: () => apiGet<ProviderConfigView[]>("/ai/config"),
  saveProvider: (body: SaveProviderBody) => apiPut<ProviderConfigView[]>("/ai/config", body),
  testProvider: (provider: AiProviderId) =>
    apiPost<ProviderTestResult>("/ai/config/test", { provider }),

  // Chat history
  listSessions: () => apiGet<ChatSessionSummary[]>("/ai/sessions"),
  createSession: () => apiPost<ChatSessionSummary>("/ai/sessions"),
  getSession: (id: string) => apiGet<ChatSessionDetail>(`/ai/sessions/${id}`),
  renameSession: (id: string, title: string) =>
    apiPatch<{ ok: true }>(`/ai/sessions/${id}`, { title }),
  deleteSession: (id: string) => apiDelete<{ ok: true }>(`/ai/sessions/${id}`),

  // Commit a write the assistant proposed and the user approved.
  executeAction: (tool: string, input: Record<string, unknown>) =>
    apiPost<CommitResult>("/ai/actions/execute", { tool, input }),

  // Budget & usage
  getUsage: () => apiGet<UsageSummary>("/ai/usage"),
  getBudget: () => apiGet<BudgetInput>("/ai/budget"),
  saveBudget: (body: BudgetInput) => apiPut<BudgetInput>("/ai/budget", body),
};
