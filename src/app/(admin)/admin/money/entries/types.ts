import { MONEY_RANGE_PERIOD, todayInput, type MoneyRange } from "../format";
import type { MoneyEntryMethod } from "@/types";

export type EntryDir = "CREDIT" | "DEBIT";
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
