import type { MoneyEntryRow } from "@/types";
import { fmtCurrency } from "../../format";

interface EntryAmountCellProps {
  entry: MoneyEntryRow;
}

const AMOUNT_COLOR: Record<MoneyEntryRow["direction"], string> = {
  CREDIT: "success.main",
  DEBIT: "error.main",
  TRANSFER: "text.secondary",
};

export function amountColor(d: MoneyEntryRow["direction"]): string {
  return AMOUNT_COLOR[d];
}

export default function EntryAmountCell({ entry: e }: EntryAmountCellProps) {
  // A linked fee is its own row; flag the parent so the account's total debit is visible.
  const fee = e.fee > 0 ? ` (+${fmtCurrency(e.fee, e.currency)} fee)` : "";
  if (e.direction === "CREDIT") return <>{`+${fmtCurrency(e.amount, e.currency)}${fee}`}</>;
  if (e.direction === "DEBIT") return <>{`−${fmtCurrency(e.amount, e.currency)}${fee}`}</>;
  // TRANSFER: show the cross-currency arrival amount when it differs.
  if (e.toAmount != null && e.toAmount !== e.amount) {
    return <>{`${fmtCurrency(e.amount, e.currency)} → ${e.toAmount.toLocaleString("en-US")}`}</>;
  }
  return <>{fmtCurrency(e.amount, e.currency)}</>;
}
