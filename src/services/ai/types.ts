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
}

/** Streamed back from a provider during a chat turn. */
export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
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
