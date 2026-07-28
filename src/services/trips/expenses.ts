// Trip expenses — the group-split ledger. A TripExpense is the source of truth for
// a shared cost; TripExpenseShare rows record each participant's slice. A linked
// MoneyEntry DEBIT is posted to the personal money ledger ONLY when the payer is
// self AND paid from a real spendable account — never a credit card (deferred,
// settled in bulk later) and never a friend (their money never touches the ledger).
import { db } from "@/lib/db";
import { MoneyEntryDirection, MoneyEntrySource, Prisma } from "@prisma/client";
import type { TripCategory, TripSplitMode } from "@prisma/client";
import { ensureCategory } from "@/services/money/categories";
import { getFxRateToBdt } from "@/services/_shared/fx";
import { toNum, toIso, money2 } from "./_serializers";
import { computeShares, type RawShare } from "./_split";
import type { TripExpenseRow, TripExpenseShareRow } from "@/types";

const TRAVEL_CATEGORY = "Travel";
const CREDIT_CARD = "CREDIT_CARD";

const EXPENSE_INCLUDE = {
  payer: { select: { name: true, isSelf: true } },
  account: { select: { name: true, type: true } },
  shares: { include: { participant: { select: { name: true } } }, orderBy: { amountBdt: "desc" } },
} satisfies Prisma.TripExpenseInclude;

type ExpenseWith = Prisma.TripExpenseGetPayload<{ include: typeof EXPENSE_INCLUDE }>;

function serializeShare(s: ExpenseWith["shares"][number]): TripExpenseShareRow {
  return {
    participantId: s.participantId,
    participantName: s.participant.name,
    amount: toNum(s.amount),
    amountBdt: toNum(s.amountBdt),
  };
}

function serializeExpense(e: ExpenseWith): TripExpenseRow {
  return {
    id: e.id,
    tripId: e.tripId,
    description: e.description,
    category: e.category,
    date: toIso(e.date)!,
    currency: e.currency,
    amount: toNum(e.amount),
    fxRate: e.fxRate == null ? null : toNum(e.fxRate),
    amountBdt: toNum(e.amountBdt),
    payerId: e.payerId,
    payerName: e.payer.name,
    payerIsSelf: e.payer.isSelf,
    splitMode: e.splitMode,
    accountId: e.accountId,
    accountName: e.account?.name ?? null,
    accountType: e.account?.type ?? null,
    posted: e.moneyEntryId != null,
    shares: e.shares.map(serializeShare),
  };
}

export async function listTripExpenses(tripId: string): Promise<TripExpenseRow[]> {
  const rows = await db.tripExpense.findMany({
    where: { tripId },
    include: EXPENSE_INCLUDE,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(serializeExpense);
}

// ── Shared resolution (create + update both fully recompute the expense) ──────

export interface TripExpenseInput {
  tripId: string;
  category: TripCategory;
  date: string;
  description?: string | null;
  /** Participant who fronted the money. */
  payerId: string;
  splitMode?: TripSplitMode;
  /** Participants sharing this cost (+ amounts when splitMode is EXACT). */
  shares: RawShare[];
  /** Funding account for a self-paid expense (cash/bank/wallet/card); null = friend-paid/untracked. */
  accountId?: string | null;
  /** Total group cost in the expense currency. */
  amount: number;
  /** Currency; defaults to the funding account's currency, else BDT. */
  currency?: string;
  /** Override the BDT-per-unit rate (else live/cached, else 1). */
  fxRate?: number;
}

interface Resolved {
  currency: string;
  fxRate: number;
  amountBdt: number;
  post: boolean;
  accountId: string | null;
  shareRows: { participantId: string; amount: number; amountBdt: number }[];
}

async function resolveExpense(input: TripExpenseInput): Promise<Resolved> {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("amount must be a finite number greater than 0");
  if (Number.isNaN(new Date(input.date).getTime())) throw new Error("date is not a valid date");
  if (input.description != null && input.description.length > 1000)
    throw new Error("description must be 1000 characters or fewer");

  const payer = await db.tripParticipant.findUnique({
    where: { id: input.payerId },
    select: { tripId: true, isSelf: true, isActive: true },
  });
  if (!payer || payer.tripId !== input.tripId)
    throw new Error("Payer is not a participant of this trip");
  if (!payer.isActive) throw new Error("Payer is no longer an active participant of this trip");

  const accountId = input.accountId || null;
  let account: { currency: string; type: string } | null = null;
  if (accountId) {
    account = await db.moneyAccount.findUnique({
      where: { id: accountId },
      select: { currency: true, type: true },
    });
    if (!account) throw new Error("Funding account not found");
  }

  // Only a self payer posts to the personal ledger, and never via a credit card.
  const post = payer.isSelf && account != null && account.type !== CREDIT_CARD;

  const currency = (account?.currency ?? input.currency ?? "BDT").toUpperCase();
  const fxRate =
    currency === "BDT"
      ? 1
      : input.fxRate && input.fxRate > 0
        ? input.fxRate
        : (await getFxRateToBdt(currency)).rate || 1;

  // Every share participant must belong to this trip.
  const shareIds = Array.from(new Set(input.shares.map((s) => s.participantId)));
  if (shareIds.length) {
    const found = await db.tripParticipant.count({
      where: { id: { in: shareIds }, tripId: input.tripId, isActive: true },
    });
    if (found !== shareIds.length)
      throw new Error("A share participant is not an active participant of this trip");
  }

  const shareRows = computeShares(input.amount, fxRate, input.splitMode ?? "EQUAL", input.shares);
  return { currency, fxRate, amountBdt: money2(input.amount * fxRate), post, accountId, shareRows };
}

export async function createTripExpense(input: TripExpenseInput): Promise<TripExpenseRow> {
  const r = await resolveExpense(input);
  const categoryId = r.post ? await ensureCategory(TRAVEL_CATEGORY, "EXPENSE") : null;

  const created = await db.$transaction(async (tx) => {
    let moneyEntryId: string | null = null;
    if (r.post && categoryId && r.accountId) {
      const entry = await tx.moneyEntry.create({
        data: {
          date: new Date(input.date),
          direction: MoneyEntryDirection.DEBIT,
          amount: input.amount,
          currency: r.currency,
          fxRate: r.fxRate,
          categoryId,
          accountId: r.accountId,
          description: input.description ?? null,
          source: MoneyEntrySource.MANUAL,
          tripId: input.tripId,
          tripCategory: input.category,
        },
        select: { id: true },
      });
      moneyEntryId = entry.id;
    }
    return tx.tripExpense.create({
      data: {
        tripId: input.tripId,
        description: input.description ?? null,
        category: input.category,
        date: new Date(input.date),
        currency: r.currency,
        amount: input.amount,
        fxRate: r.fxRate,
        amountBdt: r.amountBdt,
        payerId: input.payerId,
        splitMode: input.splitMode ?? "EQUAL",
        accountId: r.accountId,
        moneyEntryId,
        shares: {
          create: r.shareRows.map((s) => ({
            participantId: s.participantId,
            amount: s.amount,
            amountBdt: s.amountBdt,
          })),
        },
      },
      include: EXPENSE_INCLUDE,
    });
  });
  return serializeExpense(created);
}

async function loadExpense(tripId: string, expenseId: string) {
  const e = await db.tripExpense.findUnique({
    where: { id: expenseId },
    select: { tripId: true, moneyEntryId: true },
  });
  if (!e || e.tripId !== tripId) throw new Error("Expense not found for this trip");
  return e;
}

/** Full replace: the update payload carries the complete expense definition, so we
 *  recompute shares + reconcile the linked money-ledger entry (create/update/delete). */
export async function updateTripExpense(
  tripId: string,
  expenseId: string,
  input: Omit<TripExpenseInput, "tripId">
): Promise<TripExpenseRow> {
  const existing = await loadExpense(tripId, expenseId);
  const r = await resolveExpense({ ...input, tripId });
  const categoryId = r.post ? await ensureCategory(TRAVEL_CATEGORY, "EXPENSE") : null;

  const updated = await db.$transaction(async (tx) => {
    let moneyEntryId = existing.moneyEntryId;
    const entryCore = {
      date: new Date(input.date),
      amount: input.amount,
      currency: r.currency,
      fxRate: r.fxRate,
      accountId: r.accountId,
      description: input.description ?? null,
      tripCategory: input.category,
    };
    if (r.post && categoryId && r.accountId) {
      if (moneyEntryId) {
        await tx.moneyEntry.update({ where: { id: moneyEntryId }, data: entryCore });
      } else {
        const entry = await tx.moneyEntry.create({
          data: {
            ...entryCore,
            direction: MoneyEntryDirection.DEBIT,
            categoryId,
            source: MoneyEntrySource.MANUAL,
            tripId,
          },
          select: { id: true },
        });
        moneyEntryId = entry.id;
      }
    } else if (moneyEntryId) {
      // No longer posts (payer/account/card changed) — drop the ledger entry.
      await tx.moneyEntry.delete({ where: { id: moneyEntryId } });
      moneyEntryId = null;
    }

    await tx.tripExpenseShare.deleteMany({ where: { expenseId } });
    return tx.tripExpense.update({
      where: { id: expenseId },
      data: {
        description: input.description ?? null,
        category: input.category,
        date: new Date(input.date),
        currency: r.currency,
        amount: input.amount,
        fxRate: r.fxRate,
        amountBdt: r.amountBdt,
        payerId: input.payerId,
        splitMode: input.splitMode ?? "EQUAL",
        accountId: r.accountId,
        moneyEntryId,
        shares: {
          create: r.shareRows.map((s) => ({
            participantId: s.participantId,
            amount: s.amount,
            amountBdt: s.amountBdt,
          })),
        },
      },
      include: EXPENSE_INCLUDE,
    });
  });
  return serializeExpense(updated);
}

export async function deleteTripExpense(tripId: string, expenseId: string) {
  const existing = await loadExpense(tripId, expenseId);
  await db.$transaction(async (tx) => {
    await tx.tripExpense.delete({ where: { id: expenseId } }); // shares cascade
    if (existing.moneyEntryId) await tx.moneyEntry.delete({ where: { id: existing.moneyEntryId } });
  });
  return { deleted: true };
}
