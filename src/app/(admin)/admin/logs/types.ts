import type { LogSortBy } from "@/types";

export type SortDir = "asc" | "desc";
export type { LogSortBy };

export const PAGE_SIZE = 50;

export const LEVEL_OPTIONS = [
  { value: "", label: "All levels" },
  { value: "ERROR", label: "Error" },
  { value: "WARN", label: "Warning" },
  { value: "INFO", label: "Info" },
];

export const PERIOD_OPTIONS = [
  { value: "", label: "All time" },
  { value: "this_month", label: "This month" },
  { value: "last_3_months", label: "Last 3 months" },
];
