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
  if (e.direction === "CREDIT") return <>{`+${fmtCurrency(e.amount, e.currency)}`}</>;
  if (e.direction === "DEBIT") return <>{`−${fmtCurrency(e.amount, e.currency)}`}</>;
  // TRANSFER: show the cross-currency arrival amount when it differs.
  if (e.toAmount != null && e.toAmount !== e.amount) {
    return <>{`${fmtCurrency(e.amount, e.currency)} → ${e.toAmount.toLocaleString("en-US")}`}</>;
  }
  return <>{fmtCurrency(e.amount, e.currency)}</>;
}
