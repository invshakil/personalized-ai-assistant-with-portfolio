export interface MessageUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreateTokens: number;
  cost: number;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  usage?: MessageUsage;
  tools?: string[];
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
}
