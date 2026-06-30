import { aiApi } from "@/lib/api/ai";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  addMessage,
  addPendingActionToLast,
  addToolToLast,
  appendToLastContent,
  markLastStopped,
  popLastMessage,
  replaceLastMessage,
  setCurrentSessionId,
  setStreaming,
  setUsageOnLast,
} from "@/store/slices/aiChatSlice";
import { useRef } from "react";
import type { Message, MessageAttachment, PendingActionState } from "../types";

const SCOPE_RE = /^\/(property|finance|money|solar)\b\s*/i;

function parseScope(text: string): "property" | "finance" | "money" | "solar" | "all" {
  const m = text.match(SCOPE_RE);
  return m ? (m[1].toLowerCase() as "property" | "finance" | "money" | "solar") : "all";
}

interface UseChatStreamParams {
  input: string;
  setInput: (v: string) => void;
  blocked: boolean;
  pendingAttachments: MessageAttachment[];
  clearPendingAttachments: () => void;
  clearUploadError: () => void;
  refreshSessions: () => Promise<void>;
  checkBudget: () => Promise<void>;
}

export function useChatStream({
  input,
  setInput,
  blocked,
  pendingAttachments,
  clearPendingAttachments,
  clearUploadError,
  refreshSessions,
  checkBudget,
}: UseChatStreamParams) {
  const dispatch = useAppDispatch();
  const messages = useAppSelector((s) => s.aiChat.messages);
  const currentSessionId = useAppSelector((s) => s.aiChat.currentSessionId);
  const isStreaming = useAppSelector((s) => s.aiChat.isStreaming);
  const abortRef = useRef<AbortController | null>(null);

  const runTurn = async (text: string, priorMessages: Message[]) => {
    let sid = currentSessionId;
    if (!sid) {
      try {
        const created = await aiApi.createSession();
        sid = created.id;
        dispatch(setCurrentSessionId(sid));
      } catch {
        sid = null; // persistence unavailable — chat still works in-memory
      }
    }

    dispatch(setStreaming(true));
    dispatch(addMessage({ role: "assistant", content: "" }));
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/admin/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          sessionId: sid,
          scope: parseScope(text),
          // System lines are client-only approval receipts — never sent to the model.
          // Scope command is stripped so the model only sees the user's intent.
          messages: priorMessages
            .filter((m) => m.role !== "system")
            .map(({ role, content, attachments }) => ({
              role,
              content: role === "user" ? content.replace(SCOPE_RE, "") : content,
              ...(role === "user" && attachments?.length ? { attachments } : {}),
            })),
        }),
      });

      if (!res.ok || !res.body) {
        let message = "Failed to get response";
        try {
          const j = await res.json();
          if (j?.error) message = j.error;
        } catch {
          /* body wasn't JSON */
        }
        throw new Error(message);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const ev = JSON.parse(line) as {
              type: string;
              text?: string;
              name?: string;
              message?: string;
              action?: {
                id: string;
                tool: string;
                input: Record<string, unknown>;
                summary: string;
              };
              inputTokens?: number;
              outputTokens?: number;
              cacheReadTokens?: number;
              cacheCreateTokens?: number;
              cost?: number;
            };

            if (ev.type === "text" && ev.text) {
              dispatch(appendToLastContent(ev.text));
            } else if (ev.type === "tool" && ev.name) {
              dispatch(addToolToLast(ev.name));
            } else if (ev.type === "pending_action" && ev.action) {
              const action: PendingActionState = { ...ev.action, status: "pending" };
              dispatch(addPendingActionToLast(action));
            } else if (ev.type === "error" && ev.message) {
              dispatch(appendToLastContent(`\n\n⚠️ ${ev.message}`));
            } else if (ev.type === "usage") {
              dispatch(
                setUsageOnLast({
                  inputTokens: ev.inputTokens ?? 0,
                  outputTokens: ev.outputTokens ?? 0,
                  cacheReadTokens: ev.cacheReadTokens ?? 0,
                  cacheCreateTokens: ev.cacheCreateTokens ?? 0,
                  cost: ev.cost ?? 0,
                })
              );
            }
          } catch {
            /* malformed SSE line — skip */
          }
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        dispatch(markLastStopped());
      } else {
        const message =
          e instanceof Error ? e.message : "Sorry, something went wrong. Please try again.";
        dispatch(replaceLastMessage({ role: "assistant", content: "", error: message }));
      }
    } finally {
      abortRef.current = null;
      dispatch(setStreaming(false));
      refreshSessions();
      checkBudget();
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (isStreaming || blocked) return;
    if (!text && pendingAttachments.length === 0) return;

    const attachments = pendingAttachments;
    const userMsg: Message = {
      role: "user",
      content: text,
      ...(attachments.length && { attachments }),
    };
    dispatch(addMessage(userMsg));
    setInput("");
    clearPendingAttachments();
    clearUploadError();
    await runTurn(text || "(image attached)", [...messages, userMsg]);
  };

  const retryLastTurn = async () => {
    if (isStreaming || blocked) return;
    const lastUserIndex = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === "user") return i;
      }
      return -1;
    })();
    if (lastUserIndex < 0) return;
    dispatch(popLastMessage());
    const prior = messages.slice(0, lastUserIndex + 1);
    await runTurn(messages[lastUserIndex].content, prior);
  };

  const stopStreaming = () => abortRef.current?.abort();

  return { sendMessage, retryLastTurn, stopStreaming };
}
