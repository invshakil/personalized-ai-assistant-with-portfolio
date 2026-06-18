// Vendor-neutral AI types shared across the provider seam. This file is pure
// (no Prisma / no Node-only imports) so it is safe to import from client code
// with `import type`.

export type AiProviderId = "anthropic" | "openai" | "google";

/** A chat turn as sent by the client (and stored in the UI). */
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Vendor-neutral tool definition. Each adapter maps `parameters` into its own
 * dialect (Anthropic `input_schema`, OpenAI `function.parameters`, Gemini
 * `functionDeclarations`). `parameters` is a JSON-Schema object.
 */
export interface AiToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /**
   * "read" tools execute immediately and return data to the model.
   * "write" tools never execute during a turn — they are previewed and surfaced
   * to the UI as a {@link PendingAction} the user must approve. Defaults to "read".
   */
  kind?: "read" | "write";
}

/**
 * A write the model has proposed but NOT performed. The server emits one per
 * write-tool call; the UI renders an approve/cancel card and only commits it via
 * the execute endpoint once the user approves. `input` is the model's raw,
 * untrusted tool input — the commit path re-validates it through the service.
 */
export interface PendingAction {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
}

/** Result of committing an approved {@link PendingAction} via the execute endpoint. */
export interface CommitResult {
  /** Past-tense confirmation, e.g. "Created tenant Shamim (T07)." */
  summary: string;
  /** The serialized entity the service returned. */
  data: unknown;
}

/** Token usage accumulated over a turn (summed across tool-loop rounds). */
export interface UsageTotals {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
}

/** Streamed back from a provider during a chat turn. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "pending_action"; action: PendingAction }
  | { type: "usage"; usage: UsageTotals }
  | { type: "error"; message: string };

/** Executes a tool call by name; throws on failure (message is user-safe). */
export type RunTool = (name: string, input: unknown) => Promise<unknown>;

export interface StreamChatOptions {
  model: string;
  system: string;
  messages: ChatMessage[];
  tools: AiToolDef[];
  runTool: RunTool;
}

/** The interface every provider adapter implements. */
export interface AiProvider {
  id: AiProviderId;
  streamChat(opts: StreamChatOptions): AsyncIterable<StreamEvent>;
}

// ─── View types (returned to the settings UI; never include the secret) ───────

export interface ProviderConfigView {
  provider: AiProviderId;
  label: string;
  defaultModel: string;
  models: string[];
  isActive: boolean;
  enabled: boolean;
  hasKey: boolean;
  baseUrl: string | null;
  /** Whether an adapter is implemented for this provider yet. */
  supported: boolean;
}

export interface ProviderTestResult {
  ok: true;
  model: string;
}

// ─── Chat history ─────────────────────────────────────────────────────────────

export interface ChatSessionSummary {
  id: string;
  title: string;
  updatedAt: string; // ISO
}

export interface ChatSessionDetail {
  id: string;
  title: string;
  messages: ChatMessage[];
}

// ─── Budget & usage (all amounts USD) ─────────────────────────────────────────

export interface BudgetInput {
  monthlyLimitUsd: number | null;
  enforce: boolean;
}

export interface UsageSummary {
  currency: "USD";
  monthToDate: number;
  allTime: number;
  monthlyLimitUsd: number | null;
  enforce: boolean;
  remaining: number | null; // null when no limit
  pctUsed: number | null; // 0–100, null when no limit
  projectedMonthEnd: number; // run-rate projection for the current month
  overBudget: boolean; // enforce && limit && monthToDate >= limit
  monthly: { period: string; costUsd: number }[]; // "YYYY-MM", oldest first
}
