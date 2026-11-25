// Converting money out of a foreign-currency account, and what that does to the
// PENDING foreign earnings held there (realized-basis income — see _realized.ts).
//
//   foreign → BDT      realizes pending earnings: the actual BDT received is
//                      booked as income on the conversion date.
//   foreign → foreign  (e.g. EUR → USD inside Wise) is NOT income yet: the
//                      pending earnings are re-denominated into the destination
//                      currency and stay pending until they finally reach BDT.
//
// Either way ONE cross-currency ledger transfer carries the whole amount, and
// anything converted beyond the pending income on record is a plain exchange of
// balance that no earning accounts for. The allocation maths is in
// conversionPlan.ts (pure, unit-tested).
import { db, type DbClient } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { isoDayParam } from "@/services/_shared/listQuery";
import { getAccountBalance, recordTransfer } from "@/services/money";
import { toNum } from "./_serializers";
import { planConversion, round2, round6, splitProRata } from "./conversionPlan";

export interface ConvertEarningsInput {
  /** Currency being converted — must be the source account's currency. */
  currency: string;
  /**
   * Amount in `currency` to convert. Consumed oldest-first across PENDING
   * earnings in this currency; if it doesn't land on an earning boundary, the
   * straddling earning is split into a consumed portion (this earning, shrunk)
   * and a new pending row for the remainder. May exceed the pending total — up
   * to the account's real balance — in which case the excess is a plain exchange.
   */
  amount: number;
  /** Foreign Money account holding the balance (currency must match). */
  fromAccountId: string;
  /** Destination Money account — BDT, or another foreign currency. */
  toAccountId: string;
  /** Conversion value-date — drives realizedAt (the income's booking period). */
  date: string;
  /** Actual total received, in the DESTINATION account's currency. */
  toAmount: number;
  notes?: string | null;
}

export interface ConvertEarningsResult {
  /** Pending earnings the conversion touched. */
  converted: number;
  currency: string;
  toCurrency: string;
  totalOriginal: number;
  toAmount: number;
  /** Destination units per 1 source unit. */
  rate: number;
  /** True for foreign → BDT (income booked); false for a foreign → foreign exchange. */
  realized: boolean;
  /** Source amount backed by pending earnings. */
  coveredAmount: number;
  /** Source amount moved as a plain exchange (no pending earning behind it). */
  uncoveredAmount: number;
  transferEntryId: string;
}

const PENDING_SELECT = {
  id: true,
  date: true,
  sourceId: true,
  remittance: true,
  originalAmount: true,
  amount: true,
  fxRate: true,
  fiscalYear: true,
  notes: true,
  exchangeEntryId: true,
  exchangedFromCurrency: true,
  exchangedFromAmount: true,
  exchangedFromFxRate: true,
} satisfies Prisma.EarningSelect;

type PendingEarning = Prisma.EarningGetPayload<{ select: typeof PENDING_SELECT }>;

const faceOf = (e: { originalAmount: Prisma.Decimal | null; amount: Prisma.Decimal }) =>
  e.originalAmount == null ? toNum(e.amount) : toNum(e.originalAmount);

/**
 * A value-date must be a real calendar day: "1" parses as a Date but books
 * income in 2001, and "2026-02-31" silently rolls over to March. Accepts
 * YYYY-MM-DD or a full ISO timestamp (its day part is used).
 */
function parseDay(value: unknown, label: string): Date {
  const text = typeof value === "string" ? value : "";
  const day = /^\d{4}-\d{2}-\d{2}(T[\d:.+\-Z]*)?$/.test(text)
    ? isoDayParam(text.slice(0, 10))
    : undefined;
  if (!day) throw new Error(`${label} is not a valid date (expected YYYY-MM-DD)`);
  return new Date(day);
}

/** Far above any real conversion, safely inside every Decimal column the result lands in. */
const MAX_AMOUNT = 1_000_000_000;
const MAX_NOTES = 2000;

function assertAmount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || !(value > 0)) {
    throw new Error(`${label} must be greater than 0`);
  }
  if (value > MAX_AMOUNT) throw new Error(`${label} is too large`);
  return round2(value);
}

/**
 * Serialize conversions and their undos. They read a balance and the pending
 * earnings, then write against both — two running at once (two tabs, or an AI
 * approval landing beside a click) could each pass the balance check and each
 * consume the same earnings. The lock is released when the transaction ends.
 */
async function lockConversions(tx: DbClient) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('finance:earning-conversion'))`;
}

/**
 * Convert `amount` out of a foreign account at the ACTUAL rate. Posts a single
 * cross-currency Money transfer, then settles the pending earnings it covers:
 * realized to BDT income (→ BDT account), or re-denominated and still pending
 * (→ another foreign account). The transfer and the earnings are one
 * transaction — either all of it lands or none does.
 */
export async function convertEarnings(input: ConvertEarningsInput): Promise<ConvertEarningsResult> {
  const currency = typeof input.currency === "string" ? input.currency.toUpperCase() : "";
  if (!currency || currency === "BDT") throw new Error("Select a foreign currency to convert");
  const amount = assertAmount(input.amount, "Amount to convert");
  const toAmount = assertAmount(input.toAmount, "Received amount");
  const valueDate = parseDay(input.date, "Conversion date");
  const notes = input.notes ?? null;
  if (notes != null && (typeof notes !== "string" || notes.length > MAX_NOTES)) {
    throw new Error(`Notes must be text of at most ${MAX_NOTES} characters`);
  }

  const [from, to] = await Promise.all([
    db.moneyAccount.findUnique({ where: { id: input.fromAccountId }, select: { currency: true } }),
    db.moneyAccount.findUnique({ where: { id: input.toAccountId }, select: { currency: true } }),
  ]);
  if (!from || !to) throw new Error("Conversion account not found");
  if (from.currency !== currency) throw new Error(`From account must be a ${currency} account`);
  if (to.currency === currency) {
    throw new Error(
      `Both accounts hold ${currency} — that is a transfer, not a conversion. Use Money → Transfer.`
    );
  }
  const toCurrency = to.currency;
  const toBdt = toCurrency === "BDT";

  // The balance check, the pending earnings it plans against and every write
  // are ONE transaction under one lock — either all of it lands or none does.
  return db.$transaction(async (tx) => {
    await lockConversions(tx);

    // The account's real balance is the only hard ceiling: income already spent
    // elsewhere can't be converted, while balance that never was pending income
    // (an opening balance, a ledger deposit) still can.
    const availableBalance = await getAccountBalance(input.fromAccountId, tx);
    if (amount > availableBalance + 0.01) {
      throw new Error(
        `Amount ${currency} ${amount.toFixed(2)} exceeds this account's actual balance of ` +
          `${currency} ${availableBalance.toFixed(2)}.`
      );
    }

    const pending = await tx.earning.findMany({
      where: { currency, realizedAt: null },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      select: PENDING_SELECT,
    });
    const byId = new Map(pending.map((e) => [e.id, e]));

    const plan = planConversion({
      amount,
      toAmount,
      pending: pending.map((e) => ({ id: e.id, orig: faceOf(e) })),
    });
    const count = plan.allocations.length;

    // One exchange hop per earning. A second hop would overwrite what the first
    // remembered, and undoing the first would then pull its transfer out from
    // under income that has already moved on to a third currency.
    if (!toBdt) {
      const hopped = plan.allocations
        .map((a) => byId.get(a.id) as PendingEarning)
        .find((e) => e.exchangedFromCurrency);
      if (hopped) {
        throw new Error(
          `Some of this ${currency} income was already exchanged from ${hopped.exchangedFromCurrency}. ` +
            `Convert it to BDT, or undo that exchange first — chained exchanges are not supported.`
        );
      }
    }

    const parts = [
      ...(count > 0 ? [`${count} earning${count > 1 ? "s" : ""}`] : []),
      ...(plan.uncoveredSource > 0
        ? [`${currency} ${plan.uncoveredSource.toFixed(2)} balance`]
        : []),
    ];
    const description =
      `${toBdt ? "Convert" : "Exchange"} ${currency}→${toCurrency}` +
      (parts.length ? ` (${parts.join(" + ")})` : "");

    // One transfer drains the source account and credits the destination at the actual rate.
    const t = await recordTransfer(
      {
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount,
        toAmount,
        date: valueDate.toISOString().slice(0, 10),
        description,
        notes,
      },
      tx
    );

    for (const a of plan.allocations) {
      const e = byId.get(a.id) as PendingEarning;
      const isSplit = plan.split?.id === a.id;
      const oldFx = toNum(e.fxRate);
      // A split earning keeps only the consumed share of what an earlier
      // exchange remembered; the leftover row (below) carries the rest.
      const priorShare =
        isSplit && e.exchangedFromAmount != null
          ? splitProRata(toNum(e.exchangedFromAmount), a.orig, faceOf(e)).consumed
          : null;
      // Foreign → foreign: same income, new denomination, still pending. The
      // indicative BDT value is carried across by re-deriving the BDT rate.
      const indicativeBdt = round2(a.orig * oldFx);
      const newFx = round6(indicativeBdt / a.dest) || oldFx;

      const data: Prisma.EarningUpdateManyMutationInput = toBdt
        ? {
            ...(isSplit && {
              // Face value shrinks to just the consumed (realized) share.
              originalAmount: a.orig,
              amount: indicativeBdt,
              ...(priorShare != null && { exchangedFromAmount: priorShare }),
            }),
            realizedAt: valueDate,
            realizedAmount: a.dest,
            realizedRate: plan.rate,
          }
        : {
            currency: toCurrency,
            originalAmount: a.dest,
            fxRate: newFx,
            amount: round2(a.dest * newFx),
            exchangedFromCurrency: currency,
            exchangedFromAmount: a.orig,
            exchangedFromFxRate: oldFx,
          };
      // Conditional on the row still being the pending earning that was planned
      // against — anything else means the plan is stale, and the whole
      // conversion rolls back rather than settling the wrong income.
      const done = await tx.earning.updateMany({
        where: { id: a.id, currency, realizedAt: null },
        data: { ...data, ...(toBdt ? { transferEntryId: t.id } : { exchangeEntryId: t.id }) },
      });
      if (done.count !== 1) {
        throw new Error(
          "Pending earnings changed while converting — nothing was moved. Try again."
        );
      }
    }

    if (plan.split) {
      const e = byId.get(plan.split.id) as PendingEarning;
      const priorLeftover =
        e.exchangedFromAmount != null
          ? splitProRata(toNum(e.exchangedFromAmount), plan.split.consumed, faceOf(e)).leftover
          : null;
      // The unconsumed remainder stays pending in the SOURCE currency, as its own row.
      await tx.earning.create({
        data: {
          date: e.date,
          sourceId: e.sourceId,
          remittance: e.remittance,
          currency,
          originalAmount: plan.split.leftover,
          amount: round2(plan.split.leftover * toNum(e.fxRate)),
          fxRate: e.fxRate,
          fiscalYear: e.fiscalYear,
          notes: e.notes,
          ...(priorLeftover != null && {
            exchangeEntryId: e.exchangeEntryId,
            exchangedFromCurrency: e.exchangedFromCurrency,
            exchangedFromAmount: priorLeftover,
            exchangedFromFxRate: e.exchangedFromFxRate,
          }),
        },
      });
    }

    return {
      converted: count,
      currency,
      toCurrency,
      totalOriginal: amount,
      toAmount,
      rate: plan.rate,
      realized: toBdt,
      coveredAmount: plan.coveredSource,
      uncoveredAmount: plan.uncoveredSource,
      transferEntryId: t.id,
    };
  });
}

/** Delete a conversion's ledger transfer, tolerating one already removed by hand. */
async function removeTransfer(tx: DbClient, id: string | null) {
  if (!id) return;
  const exists = await tx.moneyEntry.findUnique({ where: { id }, select: { id: true } });
  if (exists) await tx.moneyEntry.delete({ where: { id } });
}

/**
 * Undo a conversion or an exchange. Pass any earning id from the batch.
 *
 * - A REALIZED foreign earning: every earning realized by the same transfer
 *   returns to pending and the conversion transfer leaves the ledger.
 * - A PENDING earning that a foreign→foreign exchange re-denominated: the batch
 *   goes back to its pre-exchange currency/amount and the exchange transfer is
 *   removed. Blocked while any part of that batch is converted to BDT. (An
 *   earning takes at most one exchange hop, so this batch is always complete.)
 *
 * If the conversion split an earning, the two rows are restored separately —
 * they aren't merged back into one.
 */
export async function reverseConversion(earningId: string) {
  return db.$transaction(async (tx) => {
    await lockConversions(tx);

    const e = await tx.earning.findUnique({
      where: { id: earningId },
      select: {
        transferEntryId: true,
        realizedAt: true,
        currency: true,
        exchangeEntryId: true,
        exchangedFromCurrency: true,
      },
    });
    if (!e) throw new Error("Earning not found");

    if (e.realizedAt && e.currency !== "BDT") {
      // Returning the earnings to pending and removing the ledger transfer are
      // the same undo. Split apart, a failure could leave pending income still
      // backed by a conversion entry — convertible a second time.
      const transferEntryId = e.transferEntryId;
      await tx.earning.updateMany({
        where: transferEntryId ? { transferEntryId } : { id: earningId },
        data: { realizedAt: null, realizedAmount: null, realizedRate: null, transferEntryId: null },
      });
      await removeTransfer(tx, transferEntryId);
      return { reversed: true, kind: "conversion" as const };
    }

    if (!e.realizedAt && e.exchangedFromCurrency) {
      const exchangeEntryId = e.exchangeEntryId;
      const batch = await tx.earning.findMany({
        where: exchangeEntryId ? { exchangeEntryId } : { id: earningId },
        select: {
          id: true,
          realizedAt: true,
          exchangedFromCurrency: true,
          exchangedFromAmount: true,
          exchangedFromFxRate: true,
        },
      });
      if (batch.some((b) => b.realizedAt)) {
        throw new Error(
          "Part of this exchange has since been converted to BDT. Reverse that conversion first."
        );
      }
      for (const b of batch) {
        if (!b.exchangedFromCurrency || b.exchangedFromAmount == null) continue;
        const orig = toNum(b.exchangedFromAmount);
        const fx = b.exchangedFromFxRate == null ? 1 : toNum(b.exchangedFromFxRate);
        await tx.earning.update({
          where: { id: b.id },
          data: {
            currency: b.exchangedFromCurrency,
            originalAmount: orig,
            fxRate: fx,
            amount: round2(orig * fx),
            exchangeEntryId: null,
            exchangedFromCurrency: null,
            exchangedFromAmount: null,
            exchangedFromFxRate: null,
          },
        });
      }
      await removeTransfer(tx, exchangeEntryId);
      return { reversed: true, kind: "exchange" as const };
    }

    throw new Error("This earning has no conversion or exchange to reverse");
  });
}

/**
 * What reversing would undo, in words — shown on the AI approval card so the
 * person approving sees the client, amounts and batch size, not a bare id.
 */
export async function describeReversal(earningId: string): Promise<string> {
  const e = await db.earning.findUnique({
    where: { id: earningId },
    select: {
      currency: true,
      originalAmount: true,
      amount: true,
      realizedAt: true,
      realizedAmount: true,
      transferEntryId: true,
      exchangeEntryId: true,
      exchangedFromCurrency: true,
      exchangedFromAmount: true,
      source: { select: { name: true } },
    },
  });
  if (!e) throw new Error("Earning not found");
  const face = `${e.currency} ${faceOf(e).toFixed(2)}`;

  if (e.realizedAt && e.currency !== "BDT") {
    const batch = e.transferEntryId
      ? await db.earning.count({ where: { transferEntryId: e.transferEntryId } })
      : 1;
    return (
      `Reverse the BDT conversion of ${face} from ${e.source.name} ` +
      `(booked as BDT ${toNum(e.realizedAmount).toFixed(2)}) — ${batch} earning${batch === 1 ? "" : "s"} ` +
      `in the batch return to pending and the conversion transfer is removed from the ledger.`
    );
  }
  if (!e.realizedAt && e.exchangedFromCurrency) {
    const batch = e.exchangeEntryId
      ? await db.earning.count({ where: { exchangeEntryId: e.exchangeEntryId } })
      : 1;
    return (
      `Undo the exchange of ${e.exchangedFromCurrency} ${toNum(e.exchangedFromAmount).toFixed(2)} → ${face} ` +
      `from ${e.source.name} — ${batch} earning${batch === 1 ? "" : "s"} in the batch return to ` +
      `${e.exchangedFromCurrency} and the exchange transfer is removed from the ledger.`
    );
  }
  throw new Error("This earning has no conversion or exchange to reverse");
}
