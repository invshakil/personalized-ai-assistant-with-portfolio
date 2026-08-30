// Persistence for the propose → approve → commit gate.
//
// A proposed write used to live only in the chat page's Redux state, which made
// it chat-shaped in two ways: the card vanished on reload (so an unapproved
// action was silently lost), and no surface other than chat could raise one.
// Storing the proposal fixes both — the id the UI holds is the row id, so any
// surface can propose and any surface can show the outcome.
//
// This module never commits anything. `commitWrite` in writeTools/ is still the
// only path that mutates, and it still runs only after the user approves.
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import type { PendingAction } from "./types";

/** Where a proposal came from. Chat is one source among several by design. */
export type ProposedActionSource = "chat" | "import" | "receipt" | "insight";

export type ProposedActionStatus = "PENDING" | "APPROVED" | "CANCELLED" | "ERROR";

export interface ProposedActionRow {
  id: string;
  source: string;
  tool: string;
  input: Record<string, unknown>;
  summary: string;
  status: ProposedActionStatus;
  result: string | null;
  createdAt: string;
}

function toRow(r: {
  id: string;
  source: string;
  tool: string;
  input: Prisma.JsonValue;
  summary: string;
  status: string;
  result: string | null;
  createdAt: Date;
}): ProposedActionRow {
  return {
    id: r.id,
    source: r.source,
    tool: r.tool,
    input: (r.input ?? {}) as Record<string, unknown>,
    summary: r.summary,
    status: r.status as ProposedActionStatus,
    result: r.result,
    createdAt: r.createdAt.toISOString(),
  };
}

/**
 * Record a proposal. `action.id` becomes the row id so the id the UI already
 * holds addresses the row directly — no second identifier to reconcile.
 *
 * Persisting must never break the turn that raised the proposal: if the write
 * fails the user still sees the card and can still approve it (the commit path
 * re-validates the input independently), so this swallows and logs.
 */
export async function saveProposedAction(input: {
  action: PendingAction;
  source: ProposedActionSource;
  sessionId?: string | null;
}): Promise<void> {
  try {
    await db.aiProposedAction.create({
      data: {
        id: input.action.id,
        source: input.source,
        sessionId: input.sessionId ?? null,
        tool: input.action.tool,
        input: input.action.input as Prisma.InputJsonValue,
        summary: input.action.summary,
      },
    });
  } catch (e) {
    console.warn("[ai/proposedActions] could not persist proposal", e);
  }
}

/**
 * Record what happened to a proposal. Best-effort for the same reason as
 * {@link saveProposedAction}: the commit already succeeded or failed on its own
 * terms, and losing the audit row must not turn a successful write into an
 * error the user sees.
 */
export async function resolveProposedAction(
  id: string,
  status: Exclude<ProposedActionStatus, "PENDING">,
  result?: string
): Promise<void> {
  try {
    await db.aiProposedAction.update({
      where: { id },
      data: { status, result: result ?? null, resolvedAt: new Date() },
    });
  } catch {
    // The proposal may predate persistence, or have been cascaded away with its
    // session. Neither is worth surfacing.
  }
}

/** Proposals raised in one chat session, oldest first — restores cards on reload. */
export async function listSessionProposedActions(sessionId: string): Promise<ProposedActionRow[]> {
  const rows = await db.aiProposedAction.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRow);
}

/** Proposals still awaiting a decision, newest first. */
export async function listPendingProposedActions(
  opts: { source?: ProposedActionSource; limit?: number } = {}
): Promise<ProposedActionRow[]> {
  const rows = await db.aiProposedAction.findMany({
    where: { status: "PENDING", ...(opts.source && { source: opts.source }) },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
  });
  return rows.map(toRow);
}
