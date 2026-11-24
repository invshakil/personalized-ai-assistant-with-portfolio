// Ledger report export (CSV / PDF): the filtered entries plus the totals a
// reader needs to trust the file on its own. Pure functions over MoneyEntryRow —
// unit-tested without a database.
import { csvMoney, type CsvCell } from "@/services/_shared/csv";
import type { MoneyEntryRow } from "@/types";

export interface LedgerTotals {
  currency: string;
  income: number;
  expense: number;
  net: number;
  /** Entries counted in income/expense (transfers are neither). */
  count: number;
}

const TYPE_LABEL: Record<MoneyEntryRow["direction"], string> = {
  CREDIT: "Income",
  DEBIT: "Expense",
  TRANSFER: "Transfer",
};

const day = (iso: string) => iso.slice(0, 10);

/**
 * Income / expense / net per currency — amounts in different currencies are
 * never added together. Transfers only move money between the user's own
 * accounts, so they are in neither column. BDT first, then alphabetical.
 */
export function ledgerTotals(entries: MoneyEntryRow[]): LedgerTotals[] {
  const m = new Map<string, { income: number; expense: number; count: number }>();
  for (const e of entries) {
    if (e.direction === "TRANSFER") continue;
    const t = m.get(e.currency) ?? { income: 0, expense: 0, count: 0 };
    if (e.direction === "CREDIT") t.income += e.amount;
    else t.expense += e.amount;
    t.count += 1;
    m.set(e.currency, t);
  }
  return [...m.entries()]
    .map(([currency, t]) => ({
      currency,
      income: csvMoney(t.income),
      expense: csvMoney(t.expense),
      net: csvMoney(t.income - t.expense),
      count: t.count,
    }))
    .sort((a, b) =>
      a.currency === "BDT" ? -1 : b.currency === "BDT" ? 1 : a.currency.localeCompare(b.currency)
    );
}

export const LEDGER_CSV_HEADER = [
  "Date",
  "Type",
  "Category",
  "Account",
  "Transfer to",
  "Person",
  "Description",
  "Notes",
  "Currency",
  "Income",
  "Expense",
  "Transfer",
  "Received (transfer)",
];

/** Header, one row per entry, then a totals block per currency. */
export function ledgerCsvRows(entries: MoneyEntryRow[], meta: string[] = []): CsvCell[][] {
  const rows: CsvCell[][] = [...meta.map((m) => [m]), ...(meta.length ? [[]] : [])];
  rows.push(LEDGER_CSV_HEADER);
  for (const e of entries) {
    rows.push([
      day(e.date),
      TYPE_LABEL[e.direction],
      e.categoryName,
      e.accountName,
      e.direction === "TRANSFER" ? e.transferAccountName : null,
      e.beneficiaryName,
      e.description,
      e.notes,
      e.currency,
      e.direction === "CREDIT" ? csvMoney(e.amount) : null,
      e.direction === "DEBIT" ? csvMoney(e.amount) : null,
      e.direction === "TRANSFER" ? csvMoney(e.amount) : null,
      // The destination amount only differs (and only matters) across currencies.
      e.direction === "TRANSFER" && e.toAmount != null && e.toAmount !== e.amount
        ? csvMoney(e.toAmount)
        : null,
    ]);
  }

  const pad = (label: string, currency: string, income: CsvCell, expense: CsvCell): CsvCell[] => [
    label,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    currency,
    income,
    expense,
  ];
  rows.push([]);
  rows.push([`Entries: ${entries.length}`]);
  for (const t of ledgerTotals(entries)) {
    rows.push(pad("Total", t.currency, t.income, t.expense));
    // Net sits under whichever column it belongs to: a surplus under Income, a deficit under Expense.
    rows.push(
      pad("Net", t.currency, t.net >= 0 ? t.net : null, t.net < 0 ? csvMoney(-t.net) : null)
    );
  }
  return rows;
}

/** What a transfer row says in the PDF's single "Details" column. */
export function ledgerRowDetail(e: MoneyEntryRow): string {
  if (e.direction === "TRANSFER") {
    const route = `${e.accountName ?? "—"} → ${e.transferAccountName ?? "—"}`;
    return e.description ? `${route} · ${e.description}` : route;
  }
  return e.description ?? e.beneficiaryName ?? "—";
}
