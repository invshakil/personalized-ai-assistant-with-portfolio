// Display helpers for the public trip cost guide. Pure formatting only — every
// number arrives already computed and rounded by getPublicTripSummary.

/** BDT in Bangladeshi/Indian digit grouping, e.g. ৳1,24,500. */
export function fmtBdt(n: number): string {
  return `৳${Math.round(n).toLocaleString("en-IN")}`;
}

/** An amount in the destination currency, e.g. RM 4,720. */
export function fmtLocal(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Short form for chart axes and insight cards, e.g. "12 Mar". */
export function fmtDayShort(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Day-of-month only, for dense chart ticks. */
export function fmtDayTick(day: string): string {
  return String(Number(day.slice(8, 10)));
}

export function fmtPct(n: number): string {
  return `${n >= 10 ? Math.round(n) : Math.round(n * 10) / 10}%`;
}
