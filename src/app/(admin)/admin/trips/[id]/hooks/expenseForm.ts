// Pure form <-> payload helpers for the trip-expense drawer, kept out of the hook
// so the hook stays under its size budget and the mapping is easy to reason about.
import type { MoneyAccountRow, TripCategory, TripExpenseRow, TripSplitMode } from "@/types";
import type { TripExpensePayload } from "@/lib/api/trips";
import { todayInput } from "../../format";

export interface TripExpenseForm {
  date: string;
  category: TripCategory;
  payerId: string;
  accountId: string; // funding account (self payer only)
  currency: string; // derived from account for self; editable for a friend-paid expense
  amount: string;
  fxRate: string;
  description: string;
  splitMode: TripSplitMode;
  participantIds: string[]; // who shares
  exactAmounts: Record<string, string>; // participantId → amount (EXACT only)
}

export function blankExpenseForm(selfId: string, activeIds: string[]): TripExpenseForm {
  return {
    date: todayInput(),
    category: "FOOD",
    payerId: selfId,
    accountId: "",
    currency: "BDT",
    amount: "",
    fxRate: "",
    description: "",
    splitMode: "EQUAL",
    participantIds: activeIds,
    exactAmounts: {},
  };
}

export function rowToExpenseForm(r: TripExpenseRow): TripExpenseForm {
  return {
    date: r.date.slice(0, 10),
    category: r.category,
    payerId: r.payerId,
    accountId: r.accountId ?? "",
    currency: r.currency,
    amount: String(r.amount),
    fxRate: r.fxRate != null ? String(r.fxRate) : "",
    description: r.description ?? "",
    splitMode: r.splitMode,
    participantIds: r.shares.map((s) => s.participantId),
    exactAmounts: Object.fromEntries(r.shares.map((s) => [s.participantId, String(s.amount)])),
  };
}

/** Build the API payload. A non-self payer can't post, so the account is dropped
 *  and the currency comes from the form; a self payer inherits the account currency. */
export function formToExpensePayload(
  form: TripExpenseForm,
  accounts: MoneyAccountRow[],
  payerSelf: boolean
): TripExpensePayload {
  const accountId = payerSelf && form.accountId ? form.accountId : null;
  const currency = accountId
    ? (accounts.find((a) => a.id === accountId)?.currency ?? "BDT")
    : form.currency;
  const foreign = currency !== "BDT";
  const shares = form.participantIds.map((id) =>
    form.splitMode === "EXACT"
      ? { participantId: id, amount: Number(form.exactAmounts[id] ?? 0) }
      : { participantId: id }
  );
  return {
    category: form.category,
    date: form.date,
    description: form.description || null,
    payerId: form.payerId,
    splitMode: form.splitMode,
    shares,
    accountId,
    amount: Number(form.amount),
    currency,
    ...(foreign && form.fxRate ? { fxRate: Number(form.fxRate) } : {}),
  };
}
