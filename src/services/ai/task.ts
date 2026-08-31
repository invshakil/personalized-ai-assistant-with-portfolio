// One-shot AI tasks — the non-conversational entry point to the provider seam.
//
// `streamChat` (via the chat route) answers open-ended questions with a tool
// loop. This module is for the other shape: classify these 200 rows, read this
// receipt, rank these signals. One call, a JSON Schema, typed data back.
//
// Every call resolves the provider through the same registry the chat route
// uses (so the active provider and encrypted key are shared), meters its own
// spend against the shared monthly budget, and records an AiUsage row tagged
// with the feature that spent it.
import { getProviderFor } from "./registry";
import { isOverBudget, recordUsage } from "./usage";
import type { AiFeature, AiProviderId, AiTaskPurpose, ChatMessage } from "./types";

/**
 * The AI could not run, but the caller's feature still can.
 *
 * Thrown when the provider is unconfigured or the monthly budget is spent —
 * both are states of the *assistant*, not failures of the surface that asked.
 * An import must still import when categorisation is unavailable, so embedded
 * callers catch this (or use {@link tryAiTask}) and carry on without suggestions.
 */
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiUnavailableError";
  }
}

export interface AiTaskOptions {
  /** Which product surface is spending — recorded on the usage row. */
  feature: AiFeature;
  /** Drives model selection. Defaults to "classify" (the fast model). */
  purpose?: AiTaskPurpose;
  system: string;
  input: string | ChatMessage[];
  /** JSON Schema describing the result object the model must return. */
  schema: Record<string, unknown>;
  maxTokens?: number;
}

/**
 * Run a one-shot structured task. Throws {@link AiUnavailableError} when the
 * assistant itself is unavailable, and a plain Error when the task genuinely
 * failed (bad response, provider error).
 */
export async function runAiTask<T>(opts: AiTaskOptions): Promise<T> {
  if (await isOverBudget()) {
    throw new AiUnavailableError(
      "The monthly AI budget has been reached. Raise or turn off the limit in Settings → AI."
    );
  }

  let active;
  try {
    active = await getProviderFor(opts.purpose ?? "classify");
  } catch (e) {
    // getProviderFor throws when no provider is active or no key is set —
    // configuration, not a task failure.
    throw new AiUnavailableError(e instanceof Error ? e.message : "AI provider not configured.");
  }

  const { result, usage } = await active.provider.complete<T>({
    model: active.model,
    system: opts.system,
    input: opts.input,
    schema: opts.schema,
    maxTokens: opts.maxTokens,
  });

  // Record spend even though the caller may discard the result — the tokens
  // were billed either way, and untagged spend is exactly what makes a shared
  // budget impossible to reason about.
  await recordUsage({
    provider: active.provider.id as AiProviderId,
    model: active.model,
    feature: opts.feature,
    usage,
  });

  return result;
}

/**
 * {@link runAiTask}, but never throws — returns `null` and logs instead.
 *
 * The default for embedded surfaces. AI in a feature page is an assist, not a
 * dependency: a failed suggestion call must degrade to "no suggestions", never
 * to a failed import or a broken drawer.
 */
export async function tryAiTask<T>(opts: AiTaskOptions): Promise<T | null> {
  try {
    return await runAiTask<T>(opts);
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e);
    console.warn(`[ai/task] ${opts.feature} task skipped: ${why}`);
    return null;
  }
}
