// Read/prune side of the application log (the write side is src/lib/logger.ts).
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { resolveRange } from "@/services/_shared/dateRange";
import type { LogPage, LogSortBy } from "@/types";

const LEVELS = ["INFO", "WARN", "ERROR"] as const;
const SORTS: LogSortBy[] = ["createdAt", "level", "source"];
const MAX_PAGE_SIZE = 200;

export interface ListLogsOptions {
  level?: string;
  source?: string;
  q?: string;
  period?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: string;
  page?: number;
  pageSize?: number;
}

export async function listLogs(opts: ListLogsOptions = {}): Promise<LogPage> {
  const range = resolveRange({ period: opts.period, from: opts.from, to: opts.to }, "all");
  const level = LEVELS.find((l) => l === opts.level);

  const where: Prisma.LogEntryWhereInput = {
    ...(level && { level }),
    ...(opts.source && { source: opts.source }),
    ...(opts.q && { message: { contains: opts.q, mode: "insensitive" } }),
    ...((range.from || range.to) && {
      createdAt: { ...(range.from && { gte: range.from }), ...(range.to && { lte: range.to }) },
    }),
  };

  const sortBy = SORTS.find((s) => s === opts.sortBy) ?? "createdAt";
  const sortDir = opts.sortDir === "asc" ? "asc" : "desc";
  const pageSize = Math.min(Math.max(opts.pageSize ?? 50, 1), MAX_PAGE_SIZE);
  const page = Math.max(opts.page ?? 1, 1);

  const [rows, total, sourceRows] = await Promise.all([
    db.logEntry.findMany({
      where,
      orderBy: [{ [sortBy]: sortDir }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.logEntry.count({ where }),
    db.logEntry.findMany({
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    }),
  ]);

  return {
    rows: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total,
    page,
    pageSize,
    sources: sourceRows.map((s) => s.source),
  };
}

/** Delete entries older than `days` (all entries when `days` is 0). Returns the count removed. */
export async function purgeLogs(days: number): Promise<number> {
  const where: Prisma.LogEntryWhereInput =
    days > 0 ? { createdAt: { lt: new Date(Date.now() - days * 86_400_000) } } : {};
  const { count } = await db.logEntry.deleteMany({ where });
  return count;
}
