// Trip Expense Manager UI formatting — reuses the shared BDT/currency/date helpers.
export {
  fmt,
  fmtCurrency,
  currencySymbol,
  fmtDate,
  todayInput,
} from "@/app/(admin)/admin/finance/format";

import type { MoneyAccountRow, TripStatus } from "@/types";
import { ACCOUNT_TYPE_LABEL } from "@/app/(admin)/admin/money/format";

export const TRIP_STATUS_COLOR: Record<TripStatus, "info" | "success" | "default"> = {
  PLANNING: "info",
  ACTIVE: "success",
  CLOSED: "default",
};

/** Options for an account picker: "Name — Bank · BDT". */
export function accountOptions(accounts: MoneyAccountRow[]) {
  return accounts.map((a) => ({
    value: a.id,
    label: `${a.name} — ${ACCOUNT_TYPE_LABEL[a.type]} · ${a.currency}`,
  }));
}
