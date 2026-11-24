// Earnings report export (CSV / PDF). Pure functions over the rows getEarnings
// returns — unit-tested without a database.
import { csvMoney, type CsvCell } from "@/services/_shared/csv";

/** The fields of a getEarnings row the export reads. */
export interface EarningExportRow {
  date: string | null;
  sourceName: string;
  remittance: "REM" | "NON_REM";
  amount: number;
  currency: string;
  originalAmount: number;
  fxRate: number;
  realizedAt: string | null;
  realizedAmount: number | null;
  pendingConversion: boolean;
  fiscalYear: string;
  notes: string | null;
}

export const REMITTANCE_TEXT: Record<EarningExportRow["remittance"], string> = {
  REM: "Remittance",
  NON_REM: "Non-remittance",
};

export interface EarningTotals {
  count: number;
  /** Sum of the BDT-equivalent column — what the page's "Total Income" card shows. */
  total: number;
  remittance: number;
  nonRemittance: number;
  /** Foreign income not yet converted: counted above at an INDICATIVE rate only. */
  pendingBdt: number;
  pendingCount: number;
}

export function earningTotals(rows: EarningExportRow[]): EarningTotals {
  const t = { count: rows.length, total: 0, remittance: 0, nonRemittance: 0, pendingBdt: 0 };
  let pendingCount = 0;
  for (const r of rows) {
    t.total += r.amount;
    if (r.remittance === "REM") t.remittance += r.amount;
    else t.nonRemittance += r.amount;
    if (r.pendingConversion) {
      t.pendingBdt += r.amount;
      pendingCount += 1;
    }
  }
  return {
    count: t.count,
    total: csvMoney(t.total),
    remittance: csvMoney(t.remittance),
    nonRemittance: csvMoney(t.nonRemittance),
    pendingBdt: csvMoney(t.pendingBdt),
    pendingCount,
  };
}

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null);

export const EARNING_CSV_HEADER = [
  "Date",
  "Client",
  "Type",
  "Currency",
  "Original amount",
  "FX rate (BDT)",
  "Amount (BDT)",
  "Status",
  "Converted on",
  "Realized (BDT)",
  "Fiscal year",
  "Notes",
];

export function earningStatus(r: EarningExportRow): string {
  if (r.currency === "BDT") return "Received";
  return r.pendingConversion ? "Pending conversion" : "Converted";
}

/** Header, one row per earning, then the totals block. */
export function earningCsvRows(rows: EarningExportRow[], meta: string[] = []): CsvCell[][] {
  const out: CsvCell[][] = [...meta.map((m) => [m]), ...(meta.length ? [[]] : [])];
  out.push(EARNING_CSV_HEADER);
  for (const r of rows) {
    const foreign = r.currency !== "BDT";
    out.push([
      day(r.date),
      r.sourceName,
      REMITTANCE_TEXT[r.remittance],
      r.currency,
      csvMoney(r.originalAmount),
      foreign ? r.fxRate : 1,
      csvMoney(r.amount),
      earningStatus(r),
      foreign ? day(r.realizedAt) : null,
      foreign && r.realizedAmount != null ? csvMoney(r.realizedAmount) : null,
      r.fiscalYear,
      r.notes,
    ]);
  }

  const t = earningTotals(rows);
  const line = (label: string, value: number): CsvCell[] => [
    label,
    null,
    null,
    null,
    null,
    null,
    value,
  ];
  out.push([]);
  out.push([`Entries: ${t.count}`]);
  out.push(line("Remittance", t.remittance));
  out.push(line("Non-remittance", t.nonRemittance));
  out.push(line("Total (BDT)", t.total));
  if (t.pendingCount > 0) {
    out.push(
      line(`Of which pending conversion (${t.pendingCount}, indicative rate)`, t.pendingBdt)
    );
  }
  return out;
}
