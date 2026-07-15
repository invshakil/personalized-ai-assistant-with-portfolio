import { db } from "@/lib/db";
import { Prisma, RemittanceType } from "@prisma/client";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { resolveRange, dateColumnWhere } from "@/services/_shared/dateRange";
import { getAccountBalance, recordLinkedEntry, recordTransfer } from "@/services/money";
import { toNum, toIso, resolveMoney, resolveMoneyUpdate } from "./_serializers";

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface GetEarningsOptions {
  fiscalYears?: string[];
  sourceIds?: string[];
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
      ...(opts.fiscalYears?.length && { fiscalYear: { in: opts.fiscalYears } }),
      ...(opts.sourceIds?.length && { sourceId: { in: opts.sourceIds } }),
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
    // Realized basis: foreign earnings are "pending" until converted.
    realizedAt: toIso(e.realizedAt),
    realizedAmount: e.realizedAmount == null ? null : toNum(e.realizedAmount),
    realizedRate: e.realizedRate == null ? null : toNum(e.realizedRate),
    pendingConversion: e.currency !== "BDT" && e.realizedAt == null,
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
  // Realized basis: BDT earnings realize on earn (counted immediately); foreign
  // earnings start pending (realizedAt NULL) and are booked only on conversion.
  const realizedOnEarn = money.currency === "BDT";
  const earning = await db.earning.create({
    data: {
      date,
      sourceId: input.sourceId,
      remittance: input.remittance,
      amount: money.amount, // BDT canonical (indicative for foreign)
      currency: money.currency,
      originalAmount: money.originalAmount,
      fxRate: money.fxRate,
      ...(realizedOnEarn && { realizedAt: date, realizedAmount: money.amount, realizedRate: 1 }),
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
      select: {
        currency: true,
        originalAmount: true,
        fxRate: true,
        amount: true,
        realizedAt: true,
      },
    });
    if (!current) throw new Error("Earning not found");
    // A converted foreign earning's currency/amount/rate are locked — they back a
    // realized BDT figure and a ledger transfer. Reverse the conversion to edit.
    if (current.realizedAt && current.currency !== "BDT") {
      throw new Error(
        "This earning is already converted. Reverse the conversion before editing its amount or currency."
      );
    }
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

// ─── Withdraw / Convert foreign earnings to BDT (realized basis) ───────────────

export interface ConvertEarningsInput {
  /** Pending foreign earnings to realize together. Must share one non-BDT currency. */
  earningIds: string[];
  /** Foreign Money account holding the balance (currency must match the earnings). */
  fromAccountId: string;
  /** Destination BDT Money account. */
  toAccountId: string;
  /** Conversion value-date — drives realizedAt (the income's booking period). */
  date: string;
  /** Actual total BDT received for the whole batch (live-prefilled, user-editable). */
  toAmount: number;
  notes?: string | null;
}

/**
 * Realize one or more pending foreign earnings to BDT at the ACTUAL rate. Posts a
 * single cross-currency Money transfer (foreign account → BDT account) for the
 * batch, then stamps each earning's realized BDT (split by its original-amount
 * share, with rounding reconciled so the parts sum to the received total). The
 * realized BDT is what the P&L books, in the conversion period.
 */
export async function convertEarnings(input: ConvertEarningsInput) {
  if (!input.earningIds?.length) throw new Error("Select at least one earning to convert");
  if (!(input.toAmount > 0)) throw new Error("Converted BDT amount must be greater than 0");

  const earnings = await db.earning.findMany({
    where: { id: { in: input.earningIds } },
    select: { id: true, currency: true, originalAmount: true, amount: true, realizedAt: true },
  });
  if (earnings.length !== input.earningIds.length) throw new Error("Some earnings were not found");

  const currency = earnings[0].currency;
  if (currency === "BDT") throw new Error("BDT earnings are already realized");
  for (const e of earnings) {
    if (e.currency !== currency) throw new Error("All selected earnings must be the same currency");
    if (e.realizedAt) throw new Error("One or more selected earnings are already converted");
  }

  const [from, to] = await Promise.all([
    db.moneyAccount.findUnique({ where: { id: input.fromAccountId }, select: { currency: true } }),
    db.moneyAccount.findUnique({ where: { id: input.toAccountId }, select: { currency: true } }),
  ]);
  if (!from || !to) throw new Error("Conversion account not found");
  if (from.currency !== currency) throw new Error(`From account must be a ${currency} account`);
  if (to.currency !== "BDT") throw new Error("To account must be a BDT account");

  const origOf = (e: { originalAmount: Prisma.Decimal | null; amount: Prisma.Decimal }) =>
    e.originalAmount == null ? toNum(e.amount) : toNum(e.originalAmount);
  const totalOriginal = earnings.reduce((s, e) => s + origOf(e), 0);
  if (!(totalOriginal > 0)) throw new Error("Selected earnings have no foreign amount to convert");

  // The account may have been drawn down since these earnings were credited
  // (e.g. a payment posted directly against it) — don't transfer out more than
  // what's actually there.
  const availableBalance = await getAccountBalance(input.fromAccountId);
  if (totalOriginal > availableBalance + 0.01) {
    throw new Error(
      `Selected earnings total ${currency} ${totalOriginal.toFixed(2)} exceeds this account's ` +
        `actual balance of ${currency} ${availableBalance.toFixed(2)} — some of it may already be ` +
        `spent (e.g. another payment or transfer). Deselect some earnings.`
    );
  }

  const effectiveRate = Math.round((input.toAmount / totalOriginal) * 1e6) / 1e6;

  // One transfer drains the foreign account and credits BDT at the actual rate.
  const transfer = await recordTransfer({
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: round2(totalOriginal),
    toAmount: round2(input.toAmount),
    date: input.date,
    description: `Convert ${currency}→BDT (${earnings.length} earning${earnings.length > 1 ? "s" : ""})`,
    notes: input.notes ?? null,
  });

  // Split realized BDT per earning by its share; reconcile the rounding remainder
  // onto the largest earning so the parts sum exactly to the received total.
  const allocations = earnings.map((e) => ({
    id: e.id,
    orig: origOf(e),
    realized: round2(origOf(e) * effectiveRate),
  }));
  const allocated = round2(allocations.reduce((s, a) => s + a.realized, 0));
  const remainder = round2(input.toAmount - allocated);
  if (remainder !== 0) {
    const biggest = allocations.reduce((mi, a, i, arr) => (a.orig > arr[mi].orig ? i : mi), 0);
    allocations[biggest].realized = round2(allocations[biggest].realized + remainder);
  }

  const realizedAt = new Date(input.date);
  await db.$transaction(
    allocations.map((a) =>
      db.earning.update({
        where: { id: a.id },
        data: {
          realizedAt,
          realizedAmount: a.realized,
          realizedRate: effectiveRate,
          transferEntryId: transfer.id,
        },
      })
    )
  );

  return {
    converted: allocations.length,
    currency,
    totalOriginal: round2(totalOriginal),
    toAmount: round2(input.toAmount),
    rate: effectiveRate,
    transferEntryId: transfer.id,
  };
}

/**
 * Undo a conversion: return every earning realized by the same transfer to
 * pending and remove the conversion entry from the ledger. Pass any earning id
 * from the batch.
 */
export async function reverseConversion(earningId: string) {
  const e = await db.earning.findUnique({
    where: { id: earningId },
    select: { transferEntryId: true, realizedAt: true, currency: true },
  });
  if (!e?.realizedAt || e.currency === "BDT")
    throw new Error("This earning is not a converted foreign earning");
  const transferEntryId = e.transferEntryId;

  await db.earning.updateMany({
    where: transferEntryId ? { transferEntryId } : { id: earningId },
    data: { realizedAt: null, realizedAmount: null, realizedRate: null, transferEntryId: null },
  });
  // Remove the conversion transfer from the ledger (ignore if already gone).
  if (transferEntryId) {
    await db.moneyEntry.delete({ where: { id: transferEntryId } }).catch(() => undefined);
  }
  return { reversed: true };
}

/** Pending (unconverted) foreign income, grouped by currency, in ORIGINAL currency. */
export async function getPendingForeignIncome() {
  const rows = await db.earning.groupBy({
    by: ["currency"],
    where: { realizedAt: null, currency: { not: "BDT" } },
    _sum: { originalAmount: true },
    _count: true,
  });
  return rows
    .map((r) => ({
      currency: r.currency,
      original: toNum(r._sum.originalAmount),
      count: r._count,
    }))
    .filter((r) => r.original > 0)
    .sort((a, b) => a.currency.localeCompare(b.currency));
}
