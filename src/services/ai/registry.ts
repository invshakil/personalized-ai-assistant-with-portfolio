// Resolves the active provider config into a live AiProvider instance. This is
// the single seam the chat route calls — swapping providers is a DB change, not
// a code change.
import { createAnthropicProvider } from "./adapters/anthropic";
import { getActiveProviderConfig, PROVIDER_CATALOG } from "./config";
import { decryptSecret } from "./crypto";
import type { AiProvider, AiTaskPurpose } from "./types";

export interface ActiveProvider {
  provider: AiProvider;
  model: string;
  label: string;
}

/**
 * Resolve the active provider with the model that suits the work.
 *
 * Classification and extraction run on the provider's fast model — they are
 * high-volume, low-judgement, and the strong model buys nothing there. Analysis
 * and chat stay on whatever model is configured in Settings → AI, because that
 * is the one the user deliberately chose for reasoning quality.
 */
export async function getProviderFor(purpose: AiTaskPurpose): Promise<ActiveProvider> {
  const active = await getActiveProvider();
  if (purpose !== "classify" && purpose !== "extract") return active;
  const entry = PROVIDER_CATALOG.find((e) => e.provider === active.provider.id);
  return entry ? { ...active, model: entry.fastModel } : active;
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
