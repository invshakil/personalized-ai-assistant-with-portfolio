/* Ledger statement PDF — the filtered entries with per-currency totals. */
import { renderToBuffer } from "@react-pdf/renderer";
import { ListDocument, pdfAmount, pdfDate, type Business } from "@/services/finance/pdfKit";
import type { MoneyEntryRow } from "@/types";
import { ledgerRowDetail, ledgerTotals } from "./ledgerExport";

/** A PDF this long is unreadable and slow to render — CSV is the tool for bulk data. */
export const MAX_PDF_ROWS = 1000;

const TYPE_LABEL: Record<MoneyEntryRow["direction"], string> = {
  CREDIT: "Income",
  DEBIT: "Expense",
  TRANSFER: "Transfer",
};

function amountText(e: MoneyEntryRow): string {
  const amount = pdfAmount(e.amount, e.currency);
  if (e.direction === "CREDIT") return `+${amount}`;
  if (e.direction === "DEBIT") return `-${amount}`;
  // Cross-currency transfer: the destination amount is in another currency whose
  // code this row does not carry, so show the figure alone.
  return e.toAmount != null && e.toAmount !== e.amount
    ? `${amount} -> ${e.toAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : amount;
}

export async function renderLedgerPdf(input: {
  entries: MoneyEntryRow[];
  business: Business;
  subtitle: string;
}): Promise<Buffer> {
  const totals = ledgerTotals(input.entries).flatMap((t) => [
    { label: `Income (${t.currency})`, value: `+${pdfAmount(t.income, t.currency)}` },
    { label: `Expense (${t.currency})`, value: `-${pdfAmount(t.expense, t.currency)}` },
    {
      label: `Net (${t.currency})`,
      value: `${t.net < 0 ? "-" : "+"}${pdfAmount(Math.abs(t.net), t.currency)}`,
    },
  ]);

  return renderToBuffer(
    <ListDocument
      business={input.business}
      docType="Ledger Statement"
      generatedAt={pdfDate(new Date().toISOString())}
      subtitle={input.subtitle}
      orientation="landscape"
      columns={[
        { label: "Date", flex: 1.1 },
        { label: "Type", flex: 0.9 },
        { label: "Category", flex: 1.6 },
        { label: "Account", flex: 1.6 },
        { label: "Details", flex: 3.4 },
        { label: "Amount", flex: 1.8, align: "right" },
      ]}
      rows={input.entries.map((e) => [
        pdfDate(e.date),
        TYPE_LABEL[e.direction],
        e.categoryName ?? "—",
        e.accountName ?? "—",
        ledgerRowDetail(e),
        amountText(e),
      ])}
      totals={totals}
      footerNote={`Transfers move money between your own accounts and are not counted as income or expense — ${input.business.name}`}
    />
  );
}
