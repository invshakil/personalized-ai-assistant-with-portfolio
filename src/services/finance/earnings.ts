import { db } from "@/lib/db";
import { Prisma, RemittanceType } from "@prisma/client";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { resolveRange, dateColumnWhere } from "@/services/_shared/dateRange";
import { toNum, toIso } from "./_serializers";

export interface GetEarningsOptions {
  fiscalYear?: string;
  sourceId?: string;
  /** Relative period token (resolved server-side) — e.g. "last_3_months". */
  period?: string;
  /** Explicit inclusive date bounds (override `period`). ISO yyyy-mm-dd. */
  from?: string;
  to?: string;
  /** Case-insensitive free-text search over notes + the remittance type label. */
  q?: string;
}

// Remittance type labels the free-text search matches against (so typing
// "remittance" / "non-rem" filters by type, mirroring the UI chip labels).
const REM_LABEL: Record<RemittanceType, string> = {
  REM: "remittance",
  NON_REM: "non-rem non remittance",
};

export async function getEarnings(opts: GetEarningsOptions = {}) {
  const range = resolveRange({ period: opts.period, from: opts.from, to: opts.to });

  // Free-text search matches notes OR any remittance type whose label contains
  // the query (e.g. "rem" → both; "non" → NON_REM only).
  const q = opts.q?.trim();
  let searchWhere: Prisma.EarningWhereInput | undefined;
  if (q) {
    const matchedTypes = (Object.keys(REM_LABEL) as RemittanceType[]).filter((t) =>
      REM_LABEL[t].includes(q.toLowerCase())
    );
    searchWhere = {
      OR: [
        { notes: { contains: q, mode: "insensitive" } },
        ...(matchedTypes.length ? [{ remittance: { in: matchedTypes } }] : []),
      ],
    };
  }

  const earnings = await db.earning.findMany({
    where: {
      ...(opts.fiscalYear && { fiscalYear: opts.fiscalYear }),
      ...(opts.sourceId && { sourceId: opts.sourceId }),
      ...dateColumnWhere(range),
      ...(searchWhere ?? {}),
    },
    orderBy: [{ date: "desc" }],
    include: { source: { select: { name: true } } },
  });
  return earnings.map((e) => ({
    id: e.id,
    date: toIso(e.date),
    sourceId: e.sourceId,
    sourceName: e.source.name,
    remittance: e.remittance,
    amount: toNum(e.amount),
    fiscalYear: e.fiscalYear,
    notes: e.notes,
  }));
}

export interface CreateEarningInput {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function createEarning(input: CreateEarningInput) {
  const date = new Date(input.date);
  const earning = await db.earning.create({
    data: {
      date,
      sourceId: input.sourceId,
      remittance: input.remittance,
      amount: input.amount,
      fiscalYear: input.fiscalYear || fiscalYearOf(date),
      notes: input.notes ?? null,
    },
  });
  return { ...earning, amount: toNum(earning.amount), date: toIso(earning.date) };
}

export interface UpdateEarningInput {
  date?: string;
  sourceId?: string;
  remittance?: RemittanceType;
  amount?: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function updateEarning(id: string, input: UpdateEarningInput) {
  const nextDate = input.date ? new Date(input.date) : undefined;
  const earning = await db.earning.update({
    where: { id },
    data: {
      ...(nextDate && { date: nextDate }),
      ...(input.sourceId && { sourceId: input.sourceId }),
      ...(input.remittance && { remittance: input.remittance }),
      ...(input.amount != null && { amount: input.amount }),
      // Recompute fiscal year from the new date unless one is explicitly given.
      ...(input.fiscalYear
        ? { fiscalYear: input.fiscalYear }
        : nextDate
          ? { fiscalYear: fiscalYearOf(nextDate) }
          : {}),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return { ...earning, amount: toNum(earning.amount), date: toIso(earning.date) };
}

export async function deleteEarning(id: string) {
  await db.earning.delete({ where: { id } });
  return { deleted: true };
}
