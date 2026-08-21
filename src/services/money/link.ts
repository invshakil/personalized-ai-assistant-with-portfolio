// Cross-domain bridge: lets the Property and Finance modules post a real entry
// into the personal Money Manager ledger when actual cash/bank moves, so the
// money lands in an account balance and shows up in the Ledger.
//
// Linking is OPT-IN per record — the caller only calls this when the user picked
// a destination account. There is no back-sync: editing or deleting the source
// rent payment / salary / expense later does NOT touch the ledger entry (the
// user manages the ledger from there). Keep that contract in mind when wiring
// new callers.
import { db, type DbClient } from "@/lib/db";
import { ensureCategory } from "./categories";
import { createEntry } from "./entries";

export interface LinkedEntryInput {
  /** Destination Money account (cash wallet, bank, etc.). Required — no account, no entry. */
  accountId: string;
  /** CREDIT = money in (rent, advance, business income); DEBIT = money out (salary, expenses). */
  direction: "CREDIT" | "DEBIT";
  /** BDT-equivalent of the source record (the canonical amount). */
  amount: number;
  /** ISO date (YYYY-MM-DD or full ISO). */
  date: string;
  /** Ledger category; find-or-created with the kind implied by `direction`. */
  categoryName: string;
  description?: string | null;
  notes?: string | null;
  /**
   * Source record's original currency + amount + rate (Financial Tracker). When
   * the destination account holds this same foreign currency, the native amount
   * lands; when the account is BDT, the BDT `amount` lands. Omit for BDT sources.
   */
  currency?: string;
  originalAmount?: number;
  fxRate?: number;
}

/** The subset of a linked entry the posting-currency rule depends on. */
type PostingSource = Pick<LinkedEntryInput, "amount" | "currency" | "originalAmount" | "fxRate">;

/**
 * Decide the posting amount + currency from the destination account's currency.
 * A BDT account takes the BDT-equivalent; a foreign account takes the native
 * amount, but only when the source is in that same currency. Anything else is a
 * mismatch and throws (protects balance integrity).
 */
function resolvePosting(acctCurrency: string, input: PostingSource) {
  const sourceCurrency = (input.currency ?? "BDT").toUpperCase();
  if (acctCurrency === "BDT") {
    return { amount: input.amount, currency: "BDT", fxRate: 1 as number | undefined };
  }
  if (acctCurrency === sourceCurrency && input.originalAmount != null) {
    return { amount: input.originalAmount, currency: sourceCurrency, fxRate: input.fxRate };
  }
  throw new Error(
    `Cannot post a ${sourceCurrency} record into a ${acctCurrency} account — currencies must match`
  );
}

async function accountCurrencyOf(accountId: string, client: DbClient = db): Promise<string> {
  const account = await client.moneyAccount.findUnique({
    where: { id: accountId },
    select: { currency: true },
  });
  return account?.currency ?? "BDT";
}

/**
 * Post a ledger entry on behalf of another domain. Find-or-creates the category
 * (INCOME for CREDIT, EXPENSE for DEBIT) and writes a normal MoneyEntry against
 * the given account. The posting currency follows the ACCOUNT: a foreign source
 * into a matching foreign account posts the native amount; a BDT account posts
 * the BDT-equivalent. A foreign source into a different foreign account is a
 * mismatch and throws (protects balance integrity). Throws on a bad
 * account/amount so the caller can surface the failure.
 *
 * Pass `client` to enlist the category find-or-create and the entry write in the
 * caller's transaction, so the source record and its ledger entry commit or roll
 * back as one unit.
 */
export async function recordLinkedEntry(input: LinkedEntryInput, client: DbClient = db) {
  const kind = input.direction === "CREDIT" ? "INCOME" : "EXPENSE";
  const categoryId = await ensureCategory(input.categoryName, kind, client);

  const {
    amount: postAmount,
    currency: postCurrency,
    fxRate: postFxRate,
  } = resolvePosting(await accountCurrencyOf(input.accountId, client), input);

  return createEntry(
    {
      date: input.date,
      direction: input.direction,
      amount: postAmount,
      currency: postCurrency,
      fxRate: postFxRate,
      categoryId,
      accountId: input.accountId,
      description: input.description ?? null,
      notes: input.notes ?? null,
    },
    client
  );
}
