// Trip expenses — thin wrappers over the money ledger. A trip expense is a normal
// DEBIT MoneyEntry: it hits a real account (cash/bank/credit card), which is what
// makes the leisure-balance-vs-credit-card behaviour fall out for free. All trip
// DEBITs share ONE "Travel" money category (kept out of the trip taxonomy); the
// fine-grained bucket lives in `tripCategory`.
import { db } from "@/lib/db";
import { createEntry, updateEntry, deleteEntry, getEntries } from "@/services/money/entries";
import { ensureCategory } from "@/services/money/categories";
import type { TripCategory } from "@prisma/client";
import type { MoneyEntryRow } from "@/types";

const TRAVEL_CATEGORY = "Travel";

export async function listTripExpenses(tripId: string): Promise<MoneyEntryRow[]> {
  // Only actual spend (DEBITs); the wallet-funding TRANSFER is shown separately.
  return getEntries({ tripId, direction: "DEBIT", sortBy: "date", sortDir: "desc" });
}

export interface CreateTripExpenseInput {
  tripId: string;
  tripCategory: TripCategory;
  /** Which account it was paid from — cash/bank (out-of-pocket) or credit card (deferred). */
  accountId: string;
  /** Amount in the account's currency. */
  amount: number;
  date: string;
  description?: string | null;
  notes?: string | null;
  /** Override the captured BDT rate for a foreign account (else live/cached). */
  fxRate?: number;
}

export async function createTripExpense(input: CreateTripExpenseInput): Promise<MoneyEntryRow> {
  if (!input.accountId) throw new Error("accountId is required for a trip expense");
  if (Number.isNaN(new Date(input.date).getTime())) throw new Error("date is not a valid date");
  const categoryId = await ensureCategory(TRAVEL_CATEGORY, "EXPENSE");
  return createEntry({
    date: input.date,
    direction: "DEBIT",
    amount: input.amount,
    categoryId,
    accountId: input.accountId,
    description: input.description ?? null,
    notes: input.notes ?? null,
    fxRate: input.fxRate,
    tripId: input.tripId,
    tripCategory: input.tripCategory,
  });
}

export interface UpdateTripExpenseInput {
  amount?: number;
  date?: string;
  tripCategory?: TripCategory;
  description?: string | null;
  notes?: string | null;
}

/** Guard: the entry must be a DEBIT belonging to THIS trip, so a trip endpoint
 *  can never mutate an unrelated (or non-trip) ledger row. */
async function assertTripExpense(tripId: string, entryId: string): Promise<void> {
  const e = await db.moneyEntry.findUnique({
    where: { id: entryId },
    select: { tripId: true, direction: true },
  });
  if (!e || e.tripId !== tripId || e.direction !== "DEBIT") {
    throw new Error("Expense not found for this trip");
  }
}

/** Edit a trip expense. To change the paying account (and thus currency), delete
 *  and re-create — updateEntry does not recompute currency/rate on account change. */
export async function updateTripExpense(
  tripId: string,
  entryId: string,
  input: UpdateTripExpenseInput
): Promise<MoneyEntryRow> {
  await assertTripExpense(tripId, entryId);
  return updateEntry(entryId, {
    ...(input.amount != null && { amount: input.amount }),
    ...(input.date && { date: input.date }),
    ...(input.tripCategory && { tripCategory: input.tripCategory }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.notes !== undefined && { notes: input.notes }),
  });
}

export async function deleteTripExpense(tripId: string, entryId: string) {
  await assertTripExpense(tripId, entryId);
  return deleteEntry(entryId);
}
