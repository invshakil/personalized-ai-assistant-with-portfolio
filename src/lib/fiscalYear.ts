// Fiscal year helpers for the Financial Tracker module.
// Bangladesh fiscal year runs July (month 7) → June (month 6) of the next year.
// Stored on each row as a "YYYY-YYYY" string (e.g. "2023-2024").

/** Returns the fiscal-year string for a given date, e.g. 2023-08-02 → "2023-2024". */
export function fiscalYearOf(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1–12
  return month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
}

/** Inclusive [start, end] date range covered by a fiscal-year string. */
export function fiscalYearRange(fiscalYear: string): { start: Date; end: Date } {
  const [startYear] = fiscalYear.split("-").map(Number);
  return {
    start: new Date(startYear, 6, 1, 0, 0, 0, 0), // Jul 1, startYear
    end: new Date(startYear + 1, 5, 30, 23, 59, 59, 999), // Jun 30, startYear + 1
  };
}

/** True if the string is a well-formed consecutive-year fiscal year, e.g. "2023-2024". */
export function isValidFiscalYear(fiscalYear: string): boolean {
  const match = /^(\d{4})-(\d{4})$/.exec(fiscalYear);
  if (!match) return false;
  return Number(match[2]) === Number(match[1]) + 1;
}

/** Sortable list of fiscal years between two dates, oldest first. */
export function fiscalYearsBetween(from: Date, to: Date): string[] {
  const years = new Set<string>();
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  while (cursor <= to) {
    years.add(fiscalYearOf(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return Array.from(years).sort();
}
