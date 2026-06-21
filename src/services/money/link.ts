// Cross-domain bridge: lets the Property and Finance modules post a real entry
// into the personal Money Manager ledger when actual cash/bank moves, so the
// money lands in an account balance and shows up in the Ledger.
//
// Linking is OPT-IN per record — the caller only calls this when the user picked
// a destination account. There is no back-sync: editing or deleting the source
// rent payment / salary / expense later does NOT touch the ledger entry (the
// user manages the ledger from there). Keep that contract in mind when wiring
// new callers.
import { ensureCategory } from "./categories";
import { createEntry } from "./entries";

export interface LinkedEntryInput {
  /** Destination Money account (cash wallet, bank, etc.). Required — no account, no entry. */
  accountId: string;
  /** CREDIT = money in (rent, advance, business income); DEBIT = money out (salary, expenses). */
  direction: "CREDIT" | "DEBIT";
  amount: number;
  /** ISO date (YYYY-MM-DD or full ISO). */
  date: string;
  /** Ledger category; find-or-created with the kind implied by `direction`. */
  categoryName: string;
  description?: string | null;
  notes?: string | null;
}

/**
 * Post a ledger entry on behalf of another domain. Find-or-creates the category
 * (INCOME for CREDIT, EXPENSE for DEBIT) and writes a normal MoneyEntry against
 * the given account. Returns the created entry. Throws on a bad account/amount
 * (validated by createEntry) so the caller can surface the failure.
 */
export async function recordLinkedEntry(input: LinkedEntryInput) {
  const kind = input.direction === "CREDIT" ? "INCOME" : "EXPENSE";
  const categoryId = await ensureCategory(input.categoryName, kind);
  return createEntry({
    date: input.date,
    direction: input.direction,
    amount: input.amount,
    categoryId,
    accountId: input.accountId,
    description: input.description ?? null,
    notes: input.notes ?? null,
  });
}
