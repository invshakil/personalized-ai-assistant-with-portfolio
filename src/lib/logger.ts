// App logger. Every entry goes to stdout as one JSON line (visible in pm2/docker
// logs) AND to the LogEntry table so /admin/logs can browse it without server
// access. Logging must never break the caller: the DB write is fire-and-forget
// and swallows its own failure (falling back to stdout only).
//
// Node runtime only (imports Prisma) — don't call from edge code.
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { prepareContext } from "@/lib/logSanitize";

export type LogLevel = "INFO" | "WARN" | "ERROR";

const MAX_MESSAGE = 2000;
function write(level: LogLevel, source: string, message: string, context?: unknown): void {
  const msg = message.length > MAX_MESSAGE ? `${message.slice(0, MAX_MESSAGE)}…` : message;
  let ctx: Prisma.InputJsonValue | null = null;
  try {
    ctx = prepareContext(context);
  } catch {
    ctx = null;
  }
  const line = JSON.stringify({ t: new Date().toISOString(), level, source, message: msg, ctx });
  if (level === "ERROR") console.error(line);
  else if (level === "WARN") console.warn(line);
  else console.log(line);

  db.logEntry
    .create({
      data: { level, source, message: msg, context: ctx ?? undefined },
    })
    .catch(() => {
      // DB unavailable (or table not migrated yet) — stdout already has it.
    });
}

export const logger = {
  info: (source: string, message: string, context?: unknown) =>
    write("INFO", source, message, context),
  warn: (source: string, message: string, context?: unknown) =>
    write("WARN", source, message, context),
  error: (source: string, message: string, context?: unknown) =>
    write("ERROR", source, message, context),
};
