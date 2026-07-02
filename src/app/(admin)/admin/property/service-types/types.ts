import type { ExpenseCategory } from "@/types";

export const CATEGORIES: ExpenseCategory[] = [
  "MAINTENANCE",
  "UTILITY",
  "SALARY",
  "SUBSCRIPTION",
  "CONSTRUCTION",
  "OTHER",
];

export const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  MAINTENANCE: "warning.main",
  UTILITY: "info.main",
  SALARY: "success.main",
  SUBSCRIPTION: "primary.main",
  CONSTRUCTION: "error.main",
  OTHER: "text.secondary",
};

export type ServiceTypeForm = { name: string; category: ExpenseCategory; description: string };

export const EMPTY_SERVICE_TYPE_FORM: ServiceTypeForm = {
  name: "",
  category: "OTHER",
  description: "",
};
