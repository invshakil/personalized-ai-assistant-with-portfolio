// Chat session history. Persists user + assistant final-text turns per session
// (tool round-trips are not stored). Titles auto-generate from the first user
// message. Used by the /api/admin/ai/sessions routes and the chat route.
import { db } from "@/lib/db";
import type { ChatSessionSummary, ChatSessionDetail } from "./types";

const toRole = (r: "USER" | "ASSISTANT"): "user" | "assistant" =>
  r === "USER" ? "user" : "assistant";

export async function listChatSessions(): Promise<ChatSessionSummary[]> {
  const rows = await db.chatSession.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
  return rows.map((r) => ({ id: r.id, title: r.title, updatedAt: r.updatedAt.toISOString() }));
}

export async function getChatSession(id: string): Promise<ChatSessionDetail | null> {
  const row = await db.chatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    messages: row.messages.map((m) => ({ role: toRole(m.role), content: m.content })),
  };
}

export async function createChatSession(): Promise<ChatSessionSummary> {
  const row = await db.chatSession.create({ data: {} });
  return { id: row.id, title: row.title, updatedAt: row.updatedAt.toISOString() };
}

export async function renameChatSession(id: string, title: string): Promise<void> {
  const t = title.trim();
  if (!t) throw new Error("Title cannot be empty.");
  await db.chatSession.update({ where: { id }, data: { title: t.slice(0, 120) } });
}

export async function deleteChatSession(id: string): Promise<void> {
  await db.chatSession.delete({ where: { id } });
}

/**
 * Persist a completed turn (user prompt + assistant answer). Auto-titles the
 * session from the first user message and bumps updatedAt.
 */
export async function appendTurn(
  sessionId: string,
  userText: string,
  assistantText: string
): Promise<void> {
  const existing = await db.chatMessage.count({ where: { sessionId } });
  const title = existing === 0 ? userText.trim().slice(0, 60) || "New chat" : undefined;
  await db.$transaction([
    db.chatMessage.create({ data: { sessionId, role: "USER", content: userText } }),
    db.chatMessage.create({ data: { sessionId, role: "ASSISTANT", content: assistantText } }),
    db.chatSession.update({ where: { id: sessionId }, data: title ? { title } : {} }),
  ]);
}
