// Ledger export: totals, CSV layout and URL-query parsing. Pure — no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ledgerCsvRows, ledgerRowDetail, ledgerTotals } from "@/services/money/ledgerExport";
import { parseEntryQuery } from "@/services/money/entryQuery";
import { toCsv } from "@/services/_shared/csv";
import type { MoneyEntryRow } from "@/types";

function entry(over: Partial<MoneyEntryRow>): MoneyEntryRow {
  return {
    id: "e",
    date: "2026-11-04T00:00:00.000Z",
    direction: "DEBIT",
    amount: 0,
    currency: "BDT",
    toAmount: null,
    fxRate: 1,
    categoryId: null,
    categoryName: null,
    categoryKind: null,
    accountId: null,
    accountName: null,
    accountType: null,
    accountTypeName: null,
    transferAccountId: null,
    transferAccountName: null,
    beneficiaryId: null,
    beneficiaryName: null,
    obligationId: null,
    description: null,
    notes: null,
    method: null,
    source: "MANUAL",
    tripId: null,
    tripCategory: null,
    fee: 0,
    feeForEntryId: null,
    ...over,
  };
}

const ENTRIES: MoneyEntryRow[] = [
  entry({ direction: "CREDIT", amount: 50000.5, categoryName: "Salary", accountName: "UCB Bank" }),
  entry({ direction: "DEBIT", amount: 1200.25, categoryName: "Groceries", accountName: "Cash" }),
  entry({ direction: "DEBIT", amount: 0.1, categoryName: "Fees", accountName: "Cash" }),
  entry({ direction: "DEBIT", amount: 0.2, categoryName: "Fees", accountName: "Cash" }),
  entry({ direction: "CREDIT", amount: 100, currency: "EUR", accountName: "Wise - Euro" }),
  entry({
    direction: "TRANSFER",
    amount: 2473.88,
    currency: "EUR",
    toAmount: 336326.59,
    accountName: "Wise - Euro",
    transferAccountName: "UCB Bank",
    description: "Convert EUR→BDT",
  }),
];

test("totals are per currency, BDT first, and exclude transfers", () => {
  const totals = ledgerTotals(ENTRIES);
  assert.deepEqual(totals, [
    { currency: "BDT", income: 50000.5, expense: 1200.55, net: 48799.95, count: 4 },
    { currency: "EUR", income: 100, expense: 0, net: 100, count: 1 },
  ]);
});

test("a deficit nets negative", () => {
  const [t] = ledgerTotals([
    entry({ direction: "CREDIT", amount: 10 }),
    entry({ direction: "DEBIT", amount: 25.5 }),
  ]);
  assert.equal(t.net, -15.5);
});

test("no income/expense entries → no totals", () => {
  assert.deepEqual(ledgerTotals([]), []);
  assert.deepEqual(ledgerTotals([entry({ direction: "TRANSFER", amount: 5 })]), []);
});

test("CSV has a header, one row per entry and a totals block that reconciles", () => {
  const rows = ledgerCsvRows(ENTRIES, ["Ledger", "Period: All time"]);
  assert.deepEqual(rows[0], ["Ledger"]);
  assert.deepEqual(rows[2], []);
  const header = rows[3] as string[];
  assert.equal(header[0], "Date");
  const body = rows.slice(4, 4 + ENTRIES.length);
  assert.equal(body.length, ENTRIES.length);

  const col = (name: string) => header.indexOf(name);
  // Income / expense / transfer land in their own columns.
  assert.equal(body[0][col("Income")], 50000.5);
  assert.equal(body[0][col("Expense")], null);
  assert.equal(body[1][col("Expense")], 1200.25);
  assert.equal(body[5][col("Transfer")], 2473.88);
  assert.equal(body[5][col("Received (transfer)")], 336326.59);
  assert.equal(body[5][col("Transfer to")], "UCB Bank");
  assert.equal(body[0][col("Date")], "2026-11-04");

  const tail = rows.slice(4 + ENTRIES.length);
  assert.deepEqual(tail[1], [`Entries: ${ENTRIES.length}`]);
  const bdtTotal = tail.find((r) => r[0] === "Total" && r[col("Currency")] === "BDT")!;
  assert.equal(bdtTotal[col("Income")], 50000.5);
  assert.equal(bdtTotal[col("Expense")], 1200.55);
  const bdtNet = tail.find((r) => r[0] === "Net" && r[col("Currency")] === "BDT")!;
  assert.equal(bdtNet[col("Income")], 48799.95);

  // The column sums in the body equal the totals row.
  const sumCol = (name: string, currency: string) =>
    Math.round(
      body
        .filter((r) => r[col("Currency")] === currency)
        .reduce(
          (s, r) => s + (typeof r[col(name)] === "number" ? (r[col(name)] as number) : 0),
          0
        ) * 100
    ) / 100;
  assert.equal(sumCol("Income", "BDT"), bdtTotal[col("Income")]);
  assert.equal(sumCol("Expense", "BDT"), bdtTotal[col("Expense")]);
});

test("a deficit's net is written under the Expense column", () => {
  const rows = ledgerCsvRows([entry({ direction: "DEBIT", amount: 40 })]);
  const net = rows.find((r) => r[0] === "Net")!;
  assert.equal(net[9], null);
  assert.equal(net[10], 40);
});

test("user-entered text in the export cannot become a spreadsheet formula", () => {
  const csv = toCsv(
    ledgerCsvRows([
      entry({ amount: 5, description: '=HYPERLINK("http://evil","x")', notes: "@cmd" }),
    ])
  );
  assert.ok(csv.includes(`"'=HYPERLINK(""http://evil"",""x"")"`));
  assert.ok(csv.includes(",'@cmd,"));
  assert.ok(!/(^|,)=HYPERLINK/m.test(csv));
});

test("PDF detail cell shows a transfer's route", () => {
  assert.equal(ledgerRowDetail(ENTRIES[5]), "Wise - Euro → UCB Bank · Convert EUR→BDT");
  assert.equal(ledgerRowDetail(entry({ description: "Lunch" })), "Lunch");
  assert.equal(ledgerRowDetail(entry({ beneficiaryName: "Rahim" })), "Rahim");
  assert.equal(ledgerRowDetail(entry({})), "—");
});

test("parseEntryQuery keeps valid filters and drops malformed ones", () => {
  const ok = parseEntryQuery(
    new URLSearchParams(
      "period=all&categoryIds=a,b&accountIds=x&currencies=eur,usd&direction=DEBIT&sortBy=amount&sortDir=asc&q=%20rent%20&limit=50"
    )
  );
  assert.deepEqual(ok, {
    period: "all",
    from: undefined,
    to: undefined,
    categoryIds: ["a", "b"],
    accountIds: ["x"],
    beneficiaryId: undefined,
    currencies: ["EUR", "USD"],
    q: "rent",
    direction: "DEBIT",
    sortBy: "amount",
    sortDir: "asc",
    limit: 50,
  });

  const bad = parseEntryQuery(
    new URLSearchParams(
      "from=not-a-date&to=2026-02-31x&direction=DROP&sortBy=id;--&sortDir=sideways&limit=-5"
    )
  );
  assert.equal(bad.from, undefined);
  assert.equal(bad.to, undefined);
  assert.equal(bad.direction, undefined);
  assert.equal(bad.sortBy, undefined);
  assert.equal(bad.sortDir, undefined);
  assert.equal(bad.limit, undefined);

  assert.equal(parseEntryQuery(new URLSearchParams("limit=999999999")).limit, 5000);
  assert.equal(parseEntryQuery(new URLSearchParams("limit=1.5")).limit, undefined);
});
