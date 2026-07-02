import type { ExpenseCategory } from "@/types";

// Sentinel for the optional "don't deduct from wallet" choice.
export const NO_ACCOUNT = "";

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

export const CATEGORIES: ExpenseCategory[] = [
  "MAINTENANCE",
  "UTILITY",
  "SALARY",
  "SUBSCRIPTION",
  "CONSTRUCTION",
  "OTHER",
];

export const CAT_LABELS: Record<ExpenseCategory, string> = {
  MAINTENANCE: "Maintenance",
  UTILITY: "Utility",
  SALARY: "Salary",
  SUBSCRIPTION: "Subscription",
  CONSTRUCTION: "Construction",
  OTHER: "Other",
};

export const CAT_COLORS: Record<ExpenseCategory, string> = {
  MAINTENANCE: "warning.main",
  UTILITY: "info.main",
  SALARY: "success.main",
  SUBSCRIPTION: "primary.main",
  CONSTRUCTION: "error.main",
  OTHER: "text.secondary",
};

export function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

export type ExpenseForm = {
  description: string;
  amount: string;
  category: ExpenseCategory;
  expenseDate: string;
  paidTo: string;
  paymentMode: string;
  payeeId: string;
  serviceTypeId: string;
  notes: string;
};

export const BLANK_EXPENSE_FORM: ExpenseForm = {
  description: "",
  amount: "",
  category: "OTHER",
  expenseDate: new Date().toISOString().split("T")[0],
  paidTo: "",
  paymentMode: "Cash",
  payeeId: "",
  serviceTypeId: "",
  notes: "",
};
