export interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  cost: number;
}

/** A write the assistant proposed, tracked with its approval lifecycle in the UI. */
export interface PendingActionState {
  id: string;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  status: "pending" | "committing" | "done" | "error" | "cancelled";
  /** Past-tense confirmation from the server once committed. */
  resultSummary?: string;
  /** Failure reason when status === "error". */
  error?: string;
}

export interface MessageAttachment {
  /** Auth-gated URL: /api/admin/ai/uploads/YYYY/MM/<cuid>.<ext> */
  url: string;
  mimeType: string;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  usage?: MessageUsage;
  tools?: string[];
  pendingActions?: PendingActionState[];
  /** Set when a turn failed — surfaces a Retry button on the assistant bubble. */
  error?: string;
  /** Set when the user stopped the stream — keeps partial content visible. */
  stopped?: boolean;
  /** Files uploaded with this turn (currently images for vision). */
  attachments?: MessageAttachment[];
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
}
