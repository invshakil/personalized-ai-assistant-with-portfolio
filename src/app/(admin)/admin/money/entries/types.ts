import { MONEY_RANGE_PERIOD, todayInput, type MoneyRange } from "../format";
import type { MoneyCategoryRow, MoneyEntryMethod } from "@/types";

export type EntryDir = "CREDIT" | "DEBIT";

/**
 * The category kind a direction requires. The server enforces the same pairing
 * (`assertCategoryMatchesDirection` in services/money/entries.ts), so any
 * category the form offers — or seeds from a default — must satisfy it, or the
 * save is rejected with "A DEBIT entry needs an EXPENSE category".
 */
export const categoryKindFor = (direction: EntryDir) =>
  direction === "CREDIT" ? "INCOME" : "EXPENSE";

/**
 * The category ids a form in `direction` may hold — exactly the set its
 * dropdown renders. Seeding a default must be checked against this, not against
 * every category: a value the dropdown has no option for renders as an empty
 * field while the id stays in form state, so the mismatch is invisible until
 * the server refuses the save.
 */
export const categoryIdsFor = (categories: MoneyCategoryRow[], direction: EntryDir): string[] =>
  categories.filter((c) => c.kind === categoryKindFor(direction)).map((c) => c.id);

export type DirFilter = "ALL" | "CREDIT" | "DEBIT" | "TRANSFER";
export type SortBy = "date" | "amount" | "category";
export type SortDir = "asc" | "desc";

// Reverse of MONEY_RANGE_PERIOD: dateRange token → UI preset key.
export const PERIOD_TO_RANGE = Object.fromEntries(
  (Object.keys(MONEY_RANGE_PERIOD) as MoneyRange[]).map((r) => [MONEY_RANGE_PERIOD[r], r])
) as Record<string, MoneyRange>;
export const DEFAULT_PERIOD = MONEY_RANGE_PERIOD.M1;

export type EntryForm = {
  date: string;
  direction: EntryDir;
  amount: string;
  categoryId: string;
  accountId: string;
  description: string;
  notes: string;
  beneficiaryId: string;
  obligationId: string;
  /** How a CREDIT arrived (cash/bank transfer/etc.) — CREDIT-only. */
  method: MoneyEntryMethod | "";
};

export type TransferForm = {
  date: string;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  /** Destination amount (destination currency) for a cross-currency transfer. */
  toAmount: string;
  /** Fee charged by the source account (source currency) — booked as an expense. */
  fee: string;
  description: string;
};

export const BLANK_ENTRY: EntryForm = {
  date: todayInput(),
  direction: "DEBIT",
  amount: "",
  categoryId: "",
  accountId: "",
  description: "",
  notes: "",
  beneficiaryId: "",
  obligationId: "",
  method: "",
};

// Entry direction → which side of an obligation it can settle.
export const DIR_TO_OBLIGATION: Record<EntryDir, "OWED_BY_ME" | "OWED_TO_ME"> = {
  DEBIT: "OWED_BY_ME", // I paid them → reduces what I owe
  CREDIT: "OWED_TO_ME", // they paid me → reduces what they owe me
};

export const BLANK_TRANSFER: TransferForm = {
  date: todayInput(),
  fromAccountId: "",
  toAccountId: "",
  amount: "",
  toAmount: "",
  fee: "",
  description: "",
};

/**
 * Reverse a transfer's direction — the Swap control between From and To.
 *
 * The two amounts are positional, not labelled: `amount` is in the source's
 * currency, `toAmount` in the destination's. On a cross-currency transfer
 * (10,000 BDT out → 380 MYR in) swapping only the accounts would leave 10,000
 * sitting under a MYR label, so the amounts travel with them and the result is
 * the exact inverse transfer. An empty `toAmount` means same-currency (or not
 * filled in yet), where `amount` must stay put rather than be blanked.
 *
 * `fee` is deliberately left alone. It is an optional number the user typed;
 * its field is relabelled with the new source currency, which is better than
 * silently discarding the input.
 */
export function swapTransferDirection(t: TransferForm): TransferForm {
  const amountsArePaired = t.toAmount !== "";
  return {
    ...t,
    fromAccountId: t.toAccountId,
    toAccountId: t.fromAccountId,
    ...(amountsArePaired && { amount: t.toAmount, toAmount: t.amount }),
  };
}
