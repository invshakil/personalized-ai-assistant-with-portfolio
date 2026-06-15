// Resolves the active provider config into a live AiProvider instance. This is
// the single seam the chat route calls — swapping providers is a DB change, not
// a code change.
import { createAnthropicProvider } from "./adapters/anthropic";
import { getActiveProviderConfig } from "./config";
import { decryptSecret } from "./crypto";
import type { AiProvider } from "./types";

export interface ActiveProvider {
  provider: AiProvider;
  model: string;
  label: string;
}

export async function getActiveProvider(): Promise<ActiveProvider> {
  const cfg = await getActiveProviderConfig();
  if (!cfg) {
    throw new Error("No AI provider is active. Configure one in Settings → AI.");
  }
  if (!cfg.apiKeyEnc || !cfg.apiKeyIv || !cfg.apiKeyTag) {
    throw new Error(`The ${cfg.label} provider has no API key set. Add one in Settings → AI.`);
  }
  const apiKey = decryptSecret({ enc: cfg.apiKeyEnc, iv: cfg.apiKeyIv, tag: cfg.apiKeyTag });

  switch (cfg.provider) {
    case "anthropic":
      return {
        provider: createAnthropicProvider({ apiKey, baseURL: cfg.baseUrl ?? undefined }),
        model: cfg.defaultModel,
        label: cfg.label,
      };
    default:
      throw new Error(`Provider "${cfg.provider}" is not supported yet.`);
  }
}
