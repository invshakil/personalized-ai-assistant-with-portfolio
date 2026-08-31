// Token pricing (USD per 1M tokens) and cost computation. Rates as of Aug 2026
// from the Anthropic pricing table. Cache reads bill at ~0.1× input, 5-minute
// cache writes at ~1.25× input. Unknown models cost 0 (tokens still recorded).
import type { UsageTotals } from "./types";

interface ModelRate {
  input: number; // $ / 1M input tokens
  output: number; // $ / 1M output tokens
}

const RATES: Record<string, ModelRate> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

const CACHE_READ_MULTIPLIER = 0.1;
const CACHE_WRITE_MULTIPLIER = 1.25;

/** USD cost for one turn's accumulated token usage on a given model. */
export function costUsd(model: string, usage: UsageTotals): number {
  const rate = RATES[model] ?? { input: 0, output: 0 };
  const perToken = (count: number, perMillion: number) => (count / 1_000_000) * perMillion;
  return (
    perToken(usage.inputTokens, rate.input) +
    perToken(usage.outputTokens, rate.output) +
    perToken(usage.cacheReadTokens, rate.input * CACHE_READ_MULTIPLIER) +
    perToken(usage.cacheCreateTokens, rate.input * CACHE_WRITE_MULTIPLIER)
  );
}

/** True if we have published rates for this model (so cost is meaningful). */
export function hasPricing(model: string): boolean {
  return model in RATES;
}
