import { useMemo, useState } from "react";
import type { RangeBounds, RangePreset } from "../types";

const RANGE_MONTHS: Record<"1M" | "3M" | "6M" | "12M", number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "12M": 12,
};

/**
 * Server-side from/to bounds for a preset (from = 1st of the first month).
 * "MONTH" filters to a single calendar month/year picked by the user.
 */
export function rangeBounds(
  preset: RangePreset,
  pick: { month: number; year: number }
): RangeBounds {
  if (preset === "ALL") return {};
  if (preset === "MONTH") {
    const m = String(pick.month).padStart(2, "0");
    return { from: `${pick.year}-${m}-01`, to: `${pick.year}-${m}-28` };
  }
  const months = RANGE_MONTHS[preset];
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return { from: from.toISOString().slice(0, 10) };
}

/**
 * Owns which slice of history is on screen: the preset, the month/year picker
 * it reveals, and the bounds those resolve to. The bounds are what the data
 * hook fetches against — filtering happens server-side, never as a client slice.
 */
export function useSolarRange() {
  const now = new Date();
  const [range, setRange] = useState<RangePreset>("12M");
  const [pickMonth, setPickMonth] = useState(now.getMonth() + 1);
  const [pickYear, setPickYear] = useState(now.getFullYear());

  const bounds = useMemo(
    () => rangeBounds(range, { month: pickMonth, year: pickYear }),
    [range, pickMonth, pickYear]
  );

  return { range, setRange, pickMonth, setPickMonth, pickYear, setPickYear, bounds };
}
