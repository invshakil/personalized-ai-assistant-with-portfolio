import { db } from "@/lib/db";
import { Prisma, RemittanceType } from "@prisma/client";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { resolveRange, dateColumnWhere } from "@/services/_shared/dateRange";
import { recordLinkedEntry } from "@/services/money";
import { toNum, toIso, resolveMoney, resolveMoneyUpdate } from "./_serializers";

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
    currency: e.currency,
    originalAmount: e.originalAmount == null ? toNum(e.amount) : toNum(e.originalAmount),
    fxRate: toNum(e.fxRate),
    fiscalYear: e.fiscalYear,
    notes: e.notes,
  }));
}

export interface CreateEarningInput {
  date: string;
  sourceId: string;
  remittance: RemittanceType;
  /** BDT-equivalent. Derived server-side from originalAmount × fxRate; legacy BDT callers may pass this. */
  amount?: number;
  /** Original currency (BDT | USD | EUR). Defaults to BDT. */
  currency?: string;
  /** Amount in `currency`. Falls back to `amount` for BDT/legacy callers. */
  originalAmount?: number;
  /** BDT per 1 unit of `currency`. Defaults to 1. */
  fxRate?: number;
  fiscalYear?: string;
  notes?: string | null;
  /**
   * Opt-in cross-domain link: when set, a CREDIT is posted to this Money account
   * after the earning is created so the cash lands in that account's balance and
   * shows in the Ledger. No account → no ledger entry. Posted once at create
   * time; not reversed on edit/delete.
   */
  accountId?: string;
}

export async function createEarning(input: CreateEarningInput) {
  const date = new Date(input.date);
  const money = resolveMoney(input);
  const earning = await db.earning.create({
    data: {
      date,
      sourceId: input.sourceId,
      remittance: input.remittance,
      amount: money.amount, // BDT canonical
      currency: money.currency,
      originalAmount: money.originalAmount,
      fxRate: money.fxRate,
      fiscalYear: input.fiscalYear || fiscalYearOf(date),
      notes: input.notes ?? null,
    },
  });

  // Opt-in cross-domain link: post a ledger CREDIT for the income received.
  if (input.accountId) {
    const source = await db.incomeSource.findUnique({
      where: { id: input.sourceId },
      select: { name: true },
    });
    await recordLinkedEntry({
      accountId: input.accountId,
      direction: "CREDIT",
      amount: money.amount,
      currency: money.currency,
      originalAmount: money.originalAmount,
      fxRate: money.fxRate,
      date: input.date,
      categoryName: "Business Income",
      description: `${source?.name ?? "client"} (${input.remittance})`,
    });
  }

  return { ...earning, amount: toNum(earning.amount), date: toIso(earning.date) };
}

export interface UpdateEarningInput {
  date?: string;
  sourceId?: string;
  remittance?: RemittanceType;
  amount?: number;
  currency?: string;
  originalAmount?: number;
  fxRate?: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function updateEarning(id: string, input: UpdateEarningInput) {
  const nextDate = input.date ? new Date(input.date) : undefined;

  // Re-resolve the currency fields (recomputes BDT `amount`) only when one of
  // them is in the patch; otherwise leave amount/currency/originalAmount/fxRate alone.
  let money: ReturnType<typeof resolveMoney> | null = null;
  if (
    input.amount !== undefined ||
    input.currency !== undefined ||
    input.originalAmount !== undefined ||
    input.fxRate !== undefined
  ) {
    const current = await db.earning.findUnique({
      where: { id },
      select: { currency: true, originalAmount: true, fxRate: true, amount: true },
    });
    if (!current) throw new Error("Earning not found");
    money = resolveMoneyUpdate(input, {
      currency: current.currency,
      originalAmount:
        current.originalAmount == null ? toNum(current.amount) : toNum(current.originalAmount),
      fxRate: toNum(current.fxRate),
    });
  }

  const earning = await db.earning.update({
    where: { id },
    data: {
      ...(nextDate && { date: nextDate }),
      ...(input.sourceId && { sourceId: input.sourceId }),
      ...(input.remittance && { remittance: input.remittance }),
      ...(money && {
        amount: money.amount,
        currency: money.currency,
        originalAmount: money.originalAmount,
        fxRate: money.fxRate,
      }),
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
