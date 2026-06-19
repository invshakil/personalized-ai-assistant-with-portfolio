// Money Manager UI formatting. The BDT currency/date helpers are surface-
// agnostic, so we reuse them from the Financial Tracker; the range presets here
// are calendar-month based (personal finance), mapping to dateRange period tokens.
export {
  fmt,
  fmtShort,
  fmtPct,
  fmtDate,
  fmtMonth,
  todayInput,
  thisMonthInput,
} from "@/app/(admin)/admin/finance/format";

import type { MoneyAccountType, MoneyEntryDirection } from "@/types";

/** Signed currency: green for in, red-ish handled by caller. e.g. +৳5,000 / −৳1,200 */
export function fmtSigned(n: number): string {
  const sign = n < 0 ? "−" : "+";
  return `${sign}৳${Math.round(Math.abs(n)).toLocaleString("en-IN")}`;
}

export const ACCOUNT_TYPE_LABEL: Record<MoneyAccountType, string> = {
  CASH: "Cash",
  BANK: "Bank",
  MOBILE_WALLET: "Mobile wallet",
  CREDIT_CARD: "Credit card",
  OTHER: "Other",
};

export const DIRECTION_LABEL: Record<MoneyEntryDirection, string> = {
  CREDIT: "Income",
  DEBIT: "Expense",
  TRANSFER: "Transfer",
};

// ─── Calendar-month range presets ─────────────────────────────────────────────

export type MoneyRange = "M1" | "M3" | "M6" | "Y1" | "ALL";

export const MONEY_RANGE_LABELS: Record<MoneyRange, string> = {
  M1: "This month",
  M3: "Last 3 months",
  M6: "Last 6 months",
  Y1: "Last 12 months",
  ALL: "All time",
};

/** Map a UI range preset to a dateRange period token (server-resolved). */
export const MONEY_RANGE_PERIOD: Record<MoneyRange, string> = {
  M1: "this_month",
  M3: "last_3_months",
  M6: "last_6_months",
  Y1: "last_12_months",
  ALL: "all",
};
