// CSV building + list/export query parsing. Pure — no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { csvCell, csvMoney, csvSafeText, safeFilename, toCsv } from "@/services/_shared/csv";
import {
  exportFormatParam,
  isCrossSiteRequest,
  isoDayParam,
  listParam,
  rangeText,
  searchParam,
} from "@/services/_shared/listQuery";

test("text that a spreadsheet would run as a formula is neutralised", () => {
  for (const evil of ['=HYPERLINK("http://x")', "+1+1", "-2+3", "@SUM(A1)", "\tx", "\r=1"]) {
    assert.equal(csvSafeText(evil), `'${evil}`);
  }
  assert.equal(csvSafeText("Rent for March"), "Rent for March");
});

test("formulas hidden behind whitespace, full-width signs or a ; split are neutralised too", () => {
  assert.equal(csvSafeText("  =1+1"), "'  =1+1");
  assert.equal(csvSafeText("\n=1+1"), "'\n=1+1");
  assert.equal(csvSafeText("\uFF1DSUM(A1)"), "'\uFF1DSUM(A1)");
  assert.equal(csvSafeText("\uFF20cmd"), "'\uFF20cmd");
  // Excel in a semicolon-list locale splits on ; — quoting keeps the cell whole.
  assert.equal(csvCell("x;=cmd|'/C calc'!A0;y"), "\"x;=cmd|'/C calc'!A0;y\"");
  assert.equal(csvCell("a\tb"), '"a\tb"');
  // Ordinary text with inner signs is left alone.
  assert.equal(csvSafeText("Rent - March"), "Rent - March");
  assert.equal(csvSafeText("a=b"), "a=b");
});

test("numbers are written verbatim — a negative amount is not mistaken for a formula", () => {
  assert.equal(csvCell(-1250.5), "-1250.5");
  assert.equal(csvCell(0), "0");
  assert.equal(csvCell(NaN), "");
  assert.equal(csvCell(Infinity), "");
});

test("cells with commas, quotes or newlines are quoted and escaped", () => {
  assert.equal(csvCell('He said "hi", twice'), '"He said ""hi"", twice"');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
  // A formula with a comma is neutralised AND quoted.
  assert.equal(csvCell("=SUM(1,2)"), '"\'=SUM(1,2)"');
});

test("toCsv emits a BOM and CRLF rows", () => {
  const csv = toCsv([
    ["Date", "Amount"],
    ["2026-11-25", 10],
  ]);
  assert.equal(csv, "﻿Date,Amount\r\n2026-11-25,10\r\n");
});

test("csvMoney strips float noise", () => {
  assert.equal(csvMoney(0.1 + 0.2), 0.3);
  assert.equal(csvMoney(1906.7400000001), 1906.74);
});

test("safeFilename cannot break out of a Content-Disposition header", () => {
  assert.equal(safeFilename('x"\r\nSet-Cookie: a=b.pdf'), "x-Set-Cookie-a-b.pdf");
  assert.equal(safeFilename("../../etc/passwd"), "etc-passwd");
  assert.equal(safeFilename("earnings-2025-2026.pdf"), "earnings-2025-2026.pdf");
  assert.equal(safeFilename("///"), "export");
  assert.ok(safeFilename("a".repeat(500)).length <= 120);
  // A pathological name is bounded before the trim regex runs (no quadratic backtracking).
  const started = Date.now();
  assert.equal(safeFilename(`a${"-".repeat(200_000)}a`), "a");
  assert.ok(Date.now() - started < 200);
});

test("query params: malformed values are dropped, not passed on", () => {
  assert.equal(isoDayParam("2026-11-25"), "2026-11-25");
  assert.equal(isoDayParam("2026-13-45"), undefined);
  // JS would roll these over into the next month instead of rejecting them.
  assert.equal(isoDayParam("2026-02-31"), undefined);
  assert.equal(isoDayParam("2026-04-31"), undefined);
  assert.equal(isoDayParam("2024-02-29"), "2024-02-29"); // a real leap day
  assert.equal(isoDayParam("yesterday"), undefined);
  assert.equal(isoDayParam("2026-11-25T00:00:00Z"), undefined);
  assert.equal(isoDayParam(null), undefined);

  assert.deepEqual(listParam("a, b,,a"), ["a", "b"]);
  assert.equal(listParam(""), undefined);
  assert.equal(listParam(null), undefined);
  assert.equal(listParam(Array.from({ length: 500 }, (_, i) => `id${i}`).join(","))?.length, 200);

  assert.equal(searchParam("  rent "), "rent");
  assert.equal(searchParam("   "), undefined);
  assert.equal(searchParam("x".repeat(999))?.length, 200);

  assert.equal(exportFormatParam("csv"), "csv");
  assert.equal(exportFormatParam("pdf"), "pdf");
  assert.equal(exportFormatParam("xlsx"), null);
  assert.equal(exportFormatParam(null), null);
});

test("cross-site requests are recognised from Sec-Fetch-Site", () => {
  assert.equal(isCrossSiteRequest(new Headers({ "sec-fetch-site": "cross-site" })), true);
  assert.equal(isCrossSiteRequest(new Headers({ "sec-fetch-site": "same-origin" })), false);
  assert.equal(isCrossSiteRequest(new Headers({ "sec-fetch-site": "none" })), false);
  assert.equal(isCrossSiteRequest(new Headers()), false); // curl, older browsers
});

test("rangeText describes the period for a report header", () => {
  assert.equal(rangeText(null, null), "All time");
  assert.equal(
    rangeText(new Date(2026, 10, 1), new Date(2026, 10, 30)),
    "01 Nov 2026 – 30 Nov 2026"
  );
  assert.equal(rangeText(null, new Date(2026, 10, 30)), "Beginning – 30 Nov 2026");
});
