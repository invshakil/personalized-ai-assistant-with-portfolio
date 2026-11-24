// CSV building for report exports. Pure string work — unit-tested.
//
// Exported files are opened in Excel / Google Sheets and passed on to other
// people, so every text cell is neutralised against formula injection: a value
// beginning with = + - @ (or a tab / carriage return) would otherwise be
// evaluated as a formula by the spreadsheet that opens it.

export type CsvCell = string | number | null | undefined;

// Characters that make a spreadsheet evaluate a cell: = + - @, their full-width
// forms, and the control characters some apps skip before looking for them.
const FORMULA_LEAD = /^[=+\-@\t\r\n\uFF1D\uFF0B\uFF0D\uFF20]/;

/**
 * Prefix a would-be formula with an apostrophe so spreadsheets treat it as text.
 * Leading whitespace is ignored when deciding — " =1+1" is still a formula to Excel.
 */
export function csvSafeText(value: string): string {
  return FORMULA_LEAD.test(value) || FORMULA_LEAD.test(value.trimStart()) ? `'${value}` : value;
}

/**
 * One cell: numbers verbatim, text neutralised then quoted when it needs it.
 * A `;` or tab is quoted too: Excel in a semicolon-list locale would otherwise
 * split the cell there and evaluate the fragment that follows.
 */
export function csvCell(value: CsvCell): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  const text = csvSafeText(value);
  return /[",;\t\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

// Built from its code point: a literal BOM in source is invisible and easy to strip.
const UTF8_BOM = String.fromCharCode(0xfeff);

/** RFC 4180 CSV (CRLF rows) with a UTF-8 BOM so Excel reads non-ASCII names correctly. */
export function toCsv(rows: CsvCell[][]): string {
  return UTF8_BOM + rows.map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** A money value as a plain 2-decimal number (no float noise like 0.30000000000000004). */
export function csvMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Reduce a download name to characters that are safe inside a Content-Disposition header. */
export function safeFilename(name: string): string {
  // Bounded first: the trim below backtracks badly on a very long run of dashes.
  const cleaned = name
    .slice(0, 200)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[-.]+|-+$/g, "");
  return (cleaned || "export").slice(0, 120);
}

/** Build the CSV download response. Financial data — never cached. */
export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFilename(filename)}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
