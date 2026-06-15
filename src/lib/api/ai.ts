// Typed client for AI provider configuration. Components call these, not fetch().
// (The chat stream itself stays on native fetch — see AiAssistantPage.)
import { apiGet, apiPut, apiPost } from "./client";
import type { AiProviderId, ProviderConfigView, ProviderTestResult } from "@/services/ai/types";

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
};
