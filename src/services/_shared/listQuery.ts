// Query-string parsing shared by the list + export routes. Everything a GET
// handler reads from the URL goes through one of these, so a malformed value is
// dropped (the filter simply doesn't apply) instead of reaching Prisma and
// surfacing as a 500.

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A yyyy-mm-dd query value, or undefined when absent, malformed or not a real
 * calendar day. `new Date("2026-02-31")` is NOT invalid in JS — it rolls over to
 * 3 March — so the value has to survive a round trip to count.
 */
export function isoDayParam(value: string | null): string | undefined {
  if (!value || !ISO_DAY.test(value)) return undefined;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString().slice(0, 10) === value ? value : undefined;
}

/** A comma-separated id list, trimmed, de-duplicated and capped. */
export function listParam(value: string | null, max = 200): string[] | undefined {
  if (!value) return undefined;
  const items = [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    ),
  ];
  return items.length ? items.slice(0, max) : undefined;
}

/** Free-text search input, trimmed and length-capped. */
export function searchParam(value: string | null, max = 200): string | undefined {
  const q = value?.trim();
  return q ? q.slice(0, max) : undefined;
}

export type ExportFormat = "csv" | "pdf";

export function exportFormatParam(value: string | null): ExportFormat | null {
  return value === "csv" || value === "pdf" ? value : null;
}

/** "01 Nov 2026 – 30 Nov 2026" / "All time" for a report header. */
export function rangeText(from: Date | null, to: Date | null): string {
  const f = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  if (!from && !to) return "All time";
  return `${from ? f(from) : "Beginning"} – ${to ? f(to) : "today"}`;
}

/**
 * True when a browser says another site triggered this request. Export routes
 * are plain GETs, so a hostile page could make a signed-in admin's browser hit
 * them repeatedly (it can't read the file, but each PDF costs CPU to render).
 * Same-origin clicks, typed URLs and non-browser clients are unaffected.
 */
export function isCrossSiteRequest(headers: Headers): boolean {
  return headers.get("sec-fetch-site") === "cross-site";
}
