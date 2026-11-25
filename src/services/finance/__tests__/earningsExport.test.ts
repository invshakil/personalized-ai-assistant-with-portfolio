// Earnings export: totals, CSV layout and URL-query parsing. Pure — no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  earningCsvRows,
  earningStatus,
  earningTotals,
  type EarningExportRow,
} from "@/services/finance/earningsExport";
import { parseEarningQuery } from "@/services/finance/earningQuery";
import { toCsv } from "@/services/_shared/csv";

function row(over: Partial<EarningExportRow>): EarningExportRow {
  return {
    date: "2026-11-04T00:00:00.000Z",
    sourceName: "David",
    remittance: "REM",
    amount: 0,
    currency: "BDT",
    originalAmount: 0,
    fxRate: 1,
    realizedAt: "2026-11-04T00:00:00.000Z",
    realizedAmount: 0,
    pendingConversion: false,
    fiscalYear: "2026-2027",
    notes: null,
    ...over,
  };
}

const ROWS: EarningExportRow[] = [
  row({ sourceName: "David", remittance: "REM", amount: 381145, originalAmount: 381145 }),
  row({ sourceName: "Christoph", remittance: "REM", amount: 430325, originalAmount: 430325 }),
  row({ sourceName: "Local Co", remittance: "NON_REM", amount: 25000.5, originalAmount: 25000.5 }),
  row({
    sourceName: "David",
    remittance: "REM",
    currency: "EUR",
    originalAmount: 1000,
    fxRate: 135.95,
    amount: 135950,
    realizedAt: null,
    realizedAmount: null,
    pendingConversion: true,
  }),
  row({
    sourceName: "Christoph",
    remittance: "NON_REM",
    currency: "USD",
    originalAmount: 500,
    fxRate: 121,
    amount: 60500,
    realizedAt: "2026-11-20T00:00:00.000Z",
    realizedAmount: 60750,
    pendingConversion: false,
  }),
];

test("totals split remittance / non-remittance and flag pending income", () => {
  assert.deepEqual(earningTotals(ROWS), {
    count: 5,
    total: 1032920.5,
    remittance: 947420,
    nonRemittance: 85500.5,
    pendingBdt: 135950,
    pendingCount: 1,
  });
  const t = earningTotals(ROWS);
  assert.equal(Math.round((t.remittance + t.nonRemittance) * 100) / 100, t.total);
});

test("empty list totals to zero", () => {
  assert.deepEqual(earningTotals([]), {
    count: 0,
    total: 0,
    remittance: 0,
    nonRemittance: 0,
    pendingBdt: 0,
    pendingCount: 0,
  });
});

test("status reads Received / Pending conversion / Converted", () => {
  assert.equal(earningStatus(ROWS[0]), "Received");
  assert.equal(earningStatus(ROWS[3]), "Pending conversion");
  assert.equal(earningStatus(ROWS[4]), "Converted");
});

test("CSV rows carry the type, the original currency and a reconciling totals block", () => {
  const rows = earningCsvRows(ROWS, ["Earnings", "All time"]);
  const header = rows[3] as string[];
  const col = (name: string) => header.indexOf(name);
  const body = rows.slice(4, 4 + ROWS.length);

  assert.equal(body[0][col("Type")], "Remittance");
  assert.equal(body[2][col("Type")], "Non-remittance");
  assert.equal(body[3][col("Currency")], "EUR");
  assert.equal(body[3][col("Original amount")], 1000);
  assert.equal(body[3][col("Status")], "Pending conversion");
  assert.equal(body[3][col("Realized (BDT)")], null);
  assert.equal(body[4][col("Converted on")], "2026-11-20");
  assert.equal(body[4][col("Realized (BDT)")], 60750);
  // BDT rows have nothing to convert.
  assert.equal(body[0][col("Converted on")], null);

  const tail = rows.slice(4 + ROWS.length);
  const amount = col("Amount (BDT)");
  const find = (label: string) => tail.find((r) => r[0] === label)!;
  assert.equal(find("Remittance")[amount], 947420);
  assert.equal(find("Non-remittance")[amount], 85500.5);
  assert.equal(find("Total (BDT)")[amount], 1032920.5);
  assert.ok(tail.some((r) => String(r[0]).startsWith("Of which pending conversion (1")));

  const bodySum = Math.round(body.reduce((s, r) => s + (r[amount] as number), 0) * 100) / 100;
  assert.equal(bodySum, find("Total (BDT)")[amount]);
});

test("no pending rows → no pending line", () => {
  const rows = earningCsvRows(ROWS.slice(0, 3));
  assert.ok(!rows.some((r) => String(r[0]).startsWith("Of which pending")));
});

test("client names and notes cannot inject spreadsheet formulas", () => {
  const csv = toCsv(earningCsvRows([row({ sourceName: "=cmd|' /C calc'!A0", notes: "+SUM(1)" })]));
  assert.ok(csv.includes("'=cmd|' /C calc'!A0"));
  assert.ok(csv.includes("'+SUM(1)"));
});

test("parseEarningQuery reads client, type, FY and range — and drops junk", () => {
  assert.deepEqual(
    parseEarningQuery(
      new URLSearchParams(
        "fiscalYears=2025-2026,2026-2027&sourceIds=s1,s2&remittance=NON_REM&period=all&q=invoice"
      )
    ),
    {
      fiscalYears: ["2025-2026", "2026-2027"],
      sourceIds: ["s1", "s2"],
      remittance: "NON_REM",
      period: "all",
      from: undefined,
      to: undefined,
      q: "invoice",
    }
  );
  // Legacy single-value spellings from the old PDF link still work.
  const legacy = parseEarningQuery(new URLSearchParams("fiscalYear=2025-2026&sourceId=s9"));
  assert.deepEqual(legacy.fiscalYears, ["2025-2026"]);
  assert.deepEqual(legacy.sourceIds, ["s9"]);

  const bad = parseEarningQuery(new URLSearchParams("remittance=ALL&from=1%2F2%2F2026&to=x"));
  assert.equal(bad.remittance, undefined);
  assert.equal(bad.from, undefined);
  assert.equal(bad.to, undefined);
});
