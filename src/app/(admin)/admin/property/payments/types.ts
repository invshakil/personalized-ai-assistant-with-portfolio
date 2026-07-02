// Sentinel for the optional "don't add to wallet" choice in account dropdowns.
export const NO_ACCOUNT = "";

export const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  PAID: { bg: "success.main", color: "#fff" },
  PARTIAL: { bg: "warning.main", color: "#fff" },
  PENDING: { bg: "action.selected", color: "text.primary" },
  OVERDUE: { bg: "error.main", color: "#fff" },
};

export function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export interface EditPaymentState {
  id: string;
  tenantName: string;
  rentDue: string;
  notes: string;
}

export interface EditTxState {
  id: string;
  paymentId: string;
}
