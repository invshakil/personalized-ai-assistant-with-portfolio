// Shared date-range resolution for report/tool functions. Relative periods
// ("last 3 months", "this fiscal year") are resolved SERVER-SIDE against the
// current date — the AI model isn't told today's date, so it can't compute them
// reliably. Tools accept a `period` token (preferred) or explicit from/to ISO
// dates (which override the token).
import { fiscalYearRange, fiscalYearOf } from "@/lib/fiscalYear";

export type PeriodToken =
  | "this_month"
  | "last_3_months"
  | "last_6_months"
  | "last_12_months"
  | "last_24_months"
  | "this_year"
  | "last_year"
  | "this_fiscal_year"
  | "last_fiscal_year"
  | "all";

export const PERIOD_TOKENS: PeriodToken[] = [
  "this_month",
  "last_3_months",
  "last_6_months",
  "last_12_months",
  "last_24_months",
  "this_year",
  "last_year",
  "this_fiscal_year",
  "last_fiscal_year",
  "all",
];

export interface RangeInput {
  period?: string;
  from?: string;
  to?: string;
}

export interface ResolvedRange {
  from: Date | null; // inclusive; null = open-ended (since the beginning)
  to: Date | null; // inclusive; null = open-ended (until now)
  label: string; // human-readable, e.g. "last 3 months" or "2025-01-01 → 2025-03-31"
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function monthsAgo(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() - n);
  return x;
}

/**
 * Resolve a range input into concrete dates. Explicit from/to win; otherwise
 * the `period` token is resolved against `now`. Falls back to `fallback` when
 * neither is supplied.
 */
export function resolveRange(input: RangeInput = {}, fallback: PeriodToken = "all"): ResolvedRange {
  if (input.from || input.to) {
    const from = input.from ? startOfDay(new Date(input.from)) : null;
    const to = input.to ? endOfDay(new Date(input.to)) : null;
    return { from, to, label: `${input.from ?? "beginning"} → ${input.to ?? "now"}` };
  }

  const token = (PERIOD_TOKENS as string[]).includes(input.period ?? "")
    ? (input.period as PeriodToken)
    : fallback;
  const now = new Date();

  switch (token) {
    case "this_month":
      return {
        from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        to: endOfDay(now),
        label: "this month",
      };
    case "last_3_months":
      return { from: startOfDay(monthsAgo(now, 3)), to: endOfDay(now), label: "last 3 months" };
    case "last_6_months":
      return { from: startOfDay(monthsAgo(now, 6)), to: endOfDay(now), label: "last 6 months" };
    case "last_12_months":
      return { from: startOfDay(monthsAgo(now, 12)), to: endOfDay(now), label: "last 12 months" };
    case "last_24_months":
      return { from: startOfDay(monthsAgo(now, 24)), to: endOfDay(now), label: "last 24 months" };
    case "this_year":
      return {
        from: startOfDay(new Date(now.getFullYear(), 0, 1)),
        to: endOfDay(now),
        label: `${now.getFullYear()}`,
      };
    case "last_year": {
      const y = now.getFullYear() - 1;
      return {
        from: startOfDay(new Date(y, 0, 1)),
        to: endOfDay(new Date(y, 11, 31)),
        label: `${y}`,
      };
    }
    case "this_fiscal_year": {
      const fy = fiscalYearOf(now);
      const { start, end } = fiscalYearRange(fy);
      return { from: start, to: end, label: `FY ${fy}` };
    }
    case "last_fiscal_year": {
      const prev = monthsAgo(now, 12);
      const fy = fiscalYearOf(prev);
      const { start, end } = fiscalYearRange(fy);
      return { from: start, to: end, label: `FY ${fy}` };
    }
    case "all":
    default:
      return { from: null, to: null, label: "all time" };
  }
}

/** Prisma `date` column filter for ledgers that store a real DateTime. */
export function dateColumnWhere(r: ResolvedRange): Record<string, unknown> {
  if (!r.from && !r.to) return {};
  return {
    date: {
      ...(r.from && { gte: r.from }),
      ...(r.to && { lte: r.to }),
    },
  };
}

/**
 * Prisma filter for tables keyed by integer `month` + `year` (property Payment,
 * Expense). Captures every (year, month) within the resolved range.
 */
export function monthYearWhere(r: ResolvedRange): Record<string, unknown> {
  if (!r.from && !r.to) return {};
  const and: Record<string, unknown>[] = [];
  if (r.from) {
    const fy = r.from.getFullYear();
    const fm = r.from.getMonth() + 1;
    and.push({ OR: [{ year: { gt: fy } }, { year: fy, month: { gte: fm } }] });
  }
  if (r.to) {
    const ty = r.to.getFullYear();
    const tm = r.to.getMonth() + 1;
    and.push({ OR: [{ year: { lt: ty } }, { year: ty, month: { lte: tm } }] });
  }
  return { AND: and };
}
