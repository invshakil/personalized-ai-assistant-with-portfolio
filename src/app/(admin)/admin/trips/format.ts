// Trip Expense Manager UI formatting — reuses the shared BDT/currency/date helpers.
export {
  fmt,
  fmtCurrency,
  currencySymbol,
  fmtDate,
  todayInput,
} from "@/app/(admin)/admin/finance/format";

import type { TripStatus } from "@/types";

export const TRIP_STATUS_COLOR: Record<TripStatus, "info" | "success" | "default"> = {
  PLANNING: "info",
  ACTIVE: "success",
  CLOSED: "default",
};
