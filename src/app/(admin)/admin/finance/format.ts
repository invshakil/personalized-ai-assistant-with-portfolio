// Shared formatting helpers for the Financial Tracker UI.
// Uses the Bangladeshi/Indian lakh–crore grouping (en-IN) since amounts are BDT.

import { fiscalYearRange } from "@/lib/fiscalYear";

/** Full currency: ৳12,34,567 */
export function fmt(n: number): string {
  return `৳${Math.round(n).toLocaleString("en-IN")}`;
}

/** Compact currency for chart axes / tight cells: ৳1.2Cr, ৳3.4L, ৳5k */
export function fmtShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `৳${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `৳${(n / 1e5).toFixed(1)}L`;
  if (abs >= 1e3) return `৳${(n / 1e3).toFixed(0)}k`;
  return `৳${Math.round(n)}`;
}

/** Margin/percent: 88.9% */
export function fmtPct(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** "2026-05-24" → "24 May 2026" (date-only, no timezone surprises). */
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Today's fiscal year string (July→June), for default form values. */
export function currentFiscalYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() + 1 >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

/** ISO date (yyyy-mm-dd) for <input type="date"> defaults. */
export function todayInput(): string {
  return new Date().toISOString().slice(0, 10);
}

/** "2026-01-01T..." → "Jan 2026" (month + year only). */
export function fmtMonth(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

/** yyyy-mm for <input type="month"> defaults (current month). */
export function thisMonthInput(): string {
  return new Date().toISOString().slice(0, 7);
}

const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** "2025-08" → "Aug '25" (compact) or "Aug 2025" (long). */
export function fmtPeriod(period: string, opts?: { long?: boolean }): string {
  const [y, m] = period.split("-");
  const month = MONTH_ABBR[Number(m) - 1] ?? m;
  return opts?.long ? `${month} ${y}` : `${month} '${y.slice(2)}`;
}

// ─── Dashboard date-range presets ─────────────────────────────────────────────

export type RangePreset = "FY" | "M1" | "M3" | "M6" | "Y1" | "Y2" | "ALL";

export const RANGE_LABELS: Record<RangePreset, string> = {
  FY: "This fiscal year",
  M1: "This month",
  M3: "Last 3 months",
  M6: "Last 6 months",
  Y1: "Last 1 year",
  Y2: "Last 2 years",
  ALL: "All time",
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const monthsAgoStart = (n: number) => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - n, 1);
};

// Maps a finance UI range preset to the shared server-side PeriodToken
// (src/services/_shared/dateRange.ts). Stored in the URL as `?period=<token>`;
// the list services resolve it against the current date. List pages use the
// FY/3-month/6-month/1-year/2-year/all set (no single-month preset).
export const FILTER_RANGE_PRESETS = ["FY", "M3", "M6", "Y1", "Y2", "ALL"] as const;
export type FilterRangePreset = (typeof FILTER_RANGE_PRESETS)[number];

export const FILTER_RANGE_LABELS: Record<FilterRangePreset, string> = {
  FY: "This fiscal year",
  M3: "Last 3 months",
  M6: "Last 6 months",
  Y1: "Last 1 year",
  Y2: "Last 2 years",
  ALL: "All time",
};

export const FILTER_RANGE_TOKEN: Record<FilterRangePreset, string> = {
  FY: "this_fiscal_year",
  M3: "last_3_months",
  M6: "last_6_months",
  Y1: "last_12_months",
  Y2: "last_24_months",
  ALL: "all",
};

/** Reverse of FILTER_RANGE_TOKEN: period token → UI preset key. */
export const TOKEN_TO_FILTER_RANGE = Object.fromEntries(
  FILTER_RANGE_PRESETS.map((p) => [FILTER_RANGE_TOKEN[p], p])
) as Record<string, FilterRangePreset>;

/** Resolve a preset to inclusive { from, to } ISO dates (empty = all time). */
export function rangeBounds(preset: RangePreset): { from?: string; to?: string } {
  const now = new Date();
  switch (preset) {
    case "ALL":
      return {};
    case "M1":
      return { from: isoDate(monthsAgoStart(0)), to: isoDate(now) };
    case "M3":
      return { from: isoDate(monthsAgoStart(2)), to: isoDate(now) };
    case "M6":
      return { from: isoDate(monthsAgoStart(5)), to: isoDate(now) };
    case "Y1":
      return { from: isoDate(monthsAgoStart(11)), to: isoDate(now) };
    case "Y2":
      return { from: isoDate(monthsAgoStart(23)), to: isoDate(now) };
    case "FY":
    default: {
      const { start } = fiscalYearRange(currentFiscalYear());
      return { from: isoDate(start), to: isoDate(now) };
    }
  }
}
