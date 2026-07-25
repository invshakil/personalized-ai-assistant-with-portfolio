// Money Manager — the personal cash-flow ledger. A single table holds every
// flow: income (CREDIT), expenses/payments (DEBIT), and account-to-account
// moves (TRANSFER). Payments to people are DEBIT entries tagged with a
// beneficiaryId (and obligationId for loan repayments). Account balances and
// the savings number are derived from these rows — see accounts.ts / dashboard.ts.
import { db } from "@/lib/db";
import { MoneyEntryDirection, MoneyEntrySource, Prisma, type TripCategory } from "@prisma/client";
import { resolveRange, dateColumnWhere, type RangeInput } from "@/services/_shared/dateRange";
import { getFxRateToBdt } from "@/services/_shared/fx";
import { ensureCategory } from "./categories";
import { toNum, toIso } from "./_serializers";
import type { MoneyEntryRow, MoneyEntryMethod } from "@/types";

const ENTRY_INCLUDE = {
  category: { select: { name: true, kind: true } },
  account: { select: { name: true, type: true } },
  transferAccount: { select: { name: true } },
  beneficiary: { select: { name: true } },
} satisfies Prisma.MoneyEntryInclude;

type EntryWithRelations = Prisma.MoneyEntryGetPayload<{ include: typeof ENTRY_INCLUDE }>;

function serializeEntry(e: EntryWithRelations): MoneyEntryRow {
  return {
    id: e.id,
    date: toIso(e.date)!,
    direction: e.direction,
    amount: toNum(e.amount),
    currency: e.currency,
    toAmount: e.toAmount == null ? null : toNum(e.toAmount),
    fxRate: e.fxRate == null ? null : toNum(e.fxRate),
    categoryId: e.categoryId,
    categoryName: e.category?.name ?? null,
    categoryKind: e.category?.kind ?? null,
    accountId: e.accountId,
    accountName: e.account?.name ?? null,
    accountType: e.account?.type ?? null,
    transferAccountId: e.transferAccountId,
    transferAccountName: e.transferAccount?.name ?? null,
    beneficiaryId: e.beneficiaryId,
    beneficiaryName: e.beneficiary?.name ?? null,
    obligationId: e.obligationId,
    description: e.description,
    notes: e.notes,
    method: e.method,
    source: e.source,
    tripId: e.tripId,
    tripCategory: e.tripCategory,
  };
}

export type EntrySortBy = "date" | "amount" | "category";
export type EntrySortDir = "asc" | "desc";

export interface GetEntriesOpts extends RangeInput {
  categoryIds?: string[];
  accountIds?: string[];
  direction?: MoneyEntryDirection;
  beneficiaryId?: string;
  /** Filter to entries belonging to a specific trip. */
  tripId?: string;
  /** Filter to entries in a specific currency (BDT | USD | EUR | …). */
  currencies?: string[];
  /** Case-insensitive search over the description field. */
  q?: string;
  sortBy?: EntrySortBy;
  sortDir?: EntrySortDir;
  limit?: number;
}

/** Map a sort selection to a Prisma orderBy; date always falls back to createdAt. */
function entryOrderBy(
  sortBy: EntrySortBy = "date",
  dir: EntrySortDir = "desc"
): Prisma.MoneyEntryOrderByWithRelationInput[] {
  switch (sortBy) {
    case "amount":
      return [{ amount: dir }, { date: "desc" }];
    case "category":
      return [{ category: { name: dir } }, { date: "desc" }];
    case "date":
    default:
      return [{ date: dir }, { createdAt: dir }];
  }
}

export async function getEntries(opts: GetEntriesOpts = {}): Promise<MoneyEntryRow[]> {
  const range = resolveRange(opts, "all");
  const entries = await db.moneyEntry.findMany({
    where: {
      ...dateColumnWhere(range),
      ...(opts.categoryIds?.length && { categoryId: { in: opts.categoryIds } }),
      ...(opts.accountIds?.length && {
        OR: [
          { accountId: { in: opts.accountIds } },
          { transferAccountId: { in: opts.accountIds } },
        ],
      }),
      ...(opts.direction && { direction: opts.direction }),
      ...(opts.beneficiaryId && { beneficiaryId: opts.beneficiaryId }),
      ...(opts.tripId && { tripId: opts.tripId }),
      ...(opts.currencies?.length && { currency: { in: opts.currencies } }),
      ...(opts.q && { description: { contains: opts.q, mode: "insensitive" } }),
    },
    orderBy: entryOrderBy(opts.sortBy, opts.sortDir),
    include: ENTRY_INCLUDE,
    ...(opts.limit && { take: opts.limit }),
  });
  return entries.map(serializeEntry);
}

export async function getEntry(id: string): Promise<MoneyEntryRow | null> {
  const e = await db.moneyEntry.findUnique({ where: { id }, include: ENTRY_INCLUDE });
  return e ? serializeEntry(e) : null;
}

/** A CREDIT must point at an INCOME category, a DEBIT at an EXPENSE category. */
async function assertCategoryMatchesDirection(
  categoryId: string,
  direction: "CREDIT" | "DEBIT"
): Promise<void> {
  const cat = await db.moneyCategory.findUnique({
    where: { id: categoryId },
    select: { kind: true },
  });
  if (!cat) throw new Error("Category not found");
  const expected = direction === "CREDIT" ? "INCOME" : "EXPENSE";
  if (cat.kind !== expected) {
    throw new Error(`A ${direction} entry needs an ${expected} category, not ${cat.kind}.`);
  }
}

/** method only makes sense on a CREDIT (money in / deposit) entry. */
function assertMethodAllowed(method: MoneyEntryMethod | null | undefined, direction: string) {
  if (method && direction !== "CREDIT") {
    throw new Error("method can only be set on a CREDIT (income/deposit) entry");
  }
}

/** The currency an account holds (BDT when no account / not found). */
async function accountCurrency(accountId: string | null | undefined): Promise<string> {
  if (!accountId) return "BDT";
  const acct = await db.moneyAccount.findUnique({
    where: { id: accountId },
    select: { currency: true },
  });
  return acct?.currency ?? "BDT";
}

/**
 * Capture the BDT-per-unit rate for a foreign currency: caller override wins,
 * else the live/cached rate, else 1 (so a missing feed never blocks a write).
 */
async function resolveEntryFxRate(currency: string, override?: number): Promise<number> {
  if (currency === "BDT") return 1;
  if (override && override > 0) return override;
  const live = await getFxRateToBdt(currency);
  return live.rate > 0 ? live.rate : 1;
}

export interface CreateEntryInput {
  date: string;
  direction: "CREDIT" | "DEBIT";
  /** Amount in the account's currency. */
  amount: number;
  categoryId: string;
  accountId?: string | null;
  beneficiaryId?: string | null;
  obligationId?: string | null;
  description?: string | null;
  notes?: string | null;
  /** How a CREDIT arrived (cash/bank transfer/etc.); CREDIT-only. */
  method?: MoneyEntryMethod | null;
  source?: MoneyEntrySource;
  /**
   * Currency of this entry. Defaults to the account's currency; only the
   * cross-domain bridge passes it explicitly. Must match the account currency.
   */
  currency?: string;
  /** Override the captured BDT rate (else live/cached, else 1). */
  fxRate?: number;
  /** Tag this entry to a trip (Trip Expense Manager). */
  tripId?: string | null;
  /** Trip budget bucket for a trip-tagged expense. */
  tripCategory?: TripCategory | null;
}

export async function createEntry(input: CreateEntryInput): Promise<MoneyEntryRow> {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("amount must be a finite number greater than 0");
  await assertCategoryMatchesDirection(input.categoryId, input.direction);
  assertMethodAllowed(input.method, input.direction);

  const acctCurrency = await accountCurrency(input.accountId);
  const currency = (input.currency ?? acctCurrency).toUpperCase();
  if (input.accountId && currency !== acctCurrency) {
    throw new Error(`Entry currency ${currency} does not match account currency ${acctCurrency}`);
  }
  const fxRate = await resolveEntryFxRate(currency, input.fxRate);

  const e = await db.moneyEntry.create({
    data: {
      date: new Date(input.date),
      direction: input.direction,
      amount: input.amount,
      currency,
      fxRate,
      categoryId: input.categoryId,
      accountId: input.accountId ?? null,
      beneficiaryId: input.beneficiaryId ?? null,
      obligationId: input.obligationId ?? null,
      description: input.description ?? null,
      notes: input.notes ?? null,
      method: input.method ?? null,
      source: input.source ?? MoneyEntrySource.MANUAL,
      tripId: input.tripId ?? null,
      tripCategory: input.tripCategory ?? null,
    },
    include: ENTRY_INCLUDE,
  });
  return serializeEntry(e);
}

export interface UpdateEntryInput {
  date?: string;
  direction?: "CREDIT" | "DEBIT";
  amount?: number;
  categoryId?: string;
  accountId?: string | null;
  beneficiaryId?: string | null;
  obligationId?: string | null;
  description?: string | null;
  notes?: string | null;
  /** How a CREDIT arrived (cash/bank transfer/etc.); CREDIT-only. */
  method?: MoneyEntryMethod | null;
  /** Re-tag to a trip (or null to untag). */
  tripId?: string | null;
  /** Change the trip budget bucket. */
  tripCategory?: TripCategory | null;
}

export async function updateEntry(id: string, input: UpdateEntryInput): Promise<MoneyEntryRow> {
  const current = await db.moneyEntry.findUnique({
    where: { id },
    select: { direction: true, categoryId: true },
  });
  if (!current) throw new Error("Entry not found");
  if (current.direction === "TRANSFER") {
    throw new Error("Transfers cannot be edited as ledger entries; delete and re-create.");
  }
  if (input.amount != null && (!Number.isFinite(input.amount) || input.amount <= 0))
    throw new Error("amount must be a finite number greater than 0");

  const nextDirection = input.direction ?? (current.direction as "CREDIT" | "DEBIT");
  const nextCategoryId = input.categoryId ?? current.categoryId;
  if ((input.direction || input.categoryId) && nextCategoryId) {
    await assertCategoryMatchesDirection(nextCategoryId, nextDirection);
  }
  if (input.method) assertMethodAllowed(input.method, nextDirection);

  const e = await db.moneyEntry.update({
    where: { id },
    data: {
      ...(input.date && { date: new Date(input.date) }),
      ...(input.direction && { direction: input.direction }),
      ...(input.amount != null && { amount: input.amount }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.accountId !== undefined && { accountId: input.accountId }),
      ...(input.beneficiaryId !== undefined && { beneficiaryId: input.beneficiaryId }),
      ...(input.obligationId !== undefined && { obligationId: input.obligationId }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.method !== undefined && { method: input.method }),
      ...(input.tripId !== undefined && { tripId: input.tripId }),
      ...(input.tripCategory !== undefined && { tripCategory: input.tripCategory }),
    },
    include: ENTRY_INCLUDE,
  });
  return serializeEntry(e);
}

export async function deleteEntry(id: string) {
  await db.moneyEntry.delete({ where: { id } });
  return { deleted: true };
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export interface RecordTransferInput {
  fromAccountId: string;
  toAccountId: string;
  /** Amount leaving the source, in the source account's currency. */
  amount: number;
  date: string;
  description?: string | null;
  notes?: string | null;
  /**
   * Amount arriving at the destination, in the DESTINATION currency. Required
   * for a cross-currency transfer; ignored (set = amount) for same-currency.
   */
  toAmount?: number;
  /**
   * Fee the source charges to move the money (e.g. a mobile-wallet cash-out
   * charge), in the SOURCE account's currency. Booked as a separate EXPENSE
   * DEBIT on the source account and linked to this transfer, so the source is
   * debited `amount + fee` while the destination still receives `toAmount`.
   */
  fee?: number;
  /** Tag this transfer to a trip (e.g. a BDT→local trip-wallet conversion). */
  tripId?: string | null;
}

/**
 * Move money between two accounts (e.g. bank → cash withdrawal, or paying a
 * credit-card bill bank → card). Recorded as ONE TRANSFER entry with no category;
 * excluded from income/expense/savings. The source loses `amount` (source
 * currency); the destination gains `toAmount` (destination currency). For a
 * same-currency transfer toAmount == amount and fxRate = 1; for a cross-currency
 * transfer the caller supplies toAmount and fxRate = toAmount / amount is stored.
 *
 * When `fee` > 0 the source is charged an extra EXPENSE DEBIT (in the source
 * currency) linked to the transfer; the transfer + fee are written atomically
 * and deleting the transfer cascades the fee away.
 */
export async function recordTransfer(input: RecordTransferInput): Promise<MoneyEntryRow> {
  if (!Number.isFinite(input.amount) || input.amount <= 0)
    throw new Error("amount must be a finite number greater than 0");
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Transfer source and destination must be different accounts");
  }
  const fee = input.fee ?? 0;
  if (!Number.isFinite(fee) || fee < 0)
    throw new Error("fee must be a finite, non-negative number");

  const [from, to] = await Promise.all([
    db.moneyAccount.findUnique({ where: { id: input.fromAccountId }, select: { currency: true } }),
    db.moneyAccount.findUnique({ where: { id: input.toAccountId }, select: { currency: true } }),
  ]);
  if (!from || !to) throw new Error("Transfer account not found");

  const crossCurrency = from.currency !== to.currency;
  let toAmount = input.amount;
  let fxRate = 1;
  if (crossCurrency) {
    if (input.toAmount == null || !Number.isFinite(input.toAmount) || input.toAmount <= 0) {
      throw new Error(
        `Cross-currency transfer (${from.currency} → ${to.currency}) requires a positive destination amount`
      );
    }
    toAmount = input.toAmount;
    fxRate = Math.round((toAmount / input.amount) * 1e6) / 1e6;
  }

  // Resolve the fee category before the transaction (find-or-create needs the
  // shared client); harmless if the transaction below rolls back.
  const feeCategoryId = fee > 0 ? await ensureCategory("Transfer Fee", "EXPENSE") : null;

  const e = await db.$transaction(async (tx) => {
    const transfer = await tx.moneyEntry.create({
      data: {
        date: new Date(input.date),
        direction: MoneyEntryDirection.TRANSFER,
        amount: input.amount,
        currency: from.currency,
        toAmount,
        fxRate,
        categoryId: null,
        accountId: input.fromAccountId,
        transferAccountId: input.toAccountId,
        description: input.description ?? null,
        notes: input.notes ?? null,
        source: MoneyEntrySource.MANUAL,
        tripId: input.tripId ?? null,
      },
      include: ENTRY_INCLUDE,
    });

    if (fee > 0 && feeCategoryId) {
      await tx.moneyEntry.create({
        data: {
          date: new Date(input.date),
          direction: MoneyEntryDirection.DEBIT,
          amount: fee,
          currency: from.currency,
          categoryId: feeCategoryId,
          accountId: input.fromAccountId,
          feeForTransferId: transfer.id,
          description: input.description ? `Transfer fee — ${input.description}` : "Transfer fee",
          source: MoneyEntrySource.MANUAL,
        },
      });
    }

    return transfer;
  });

  return serializeEntry(e);
}
