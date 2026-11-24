/* Earnings statement PDF — the filtered earnings with remittance / total lines. */
import { renderToBuffer } from "@react-pdf/renderer";
import { ListDocument, pdfAmount, pdfDate, pdfForeign, type Business } from "./pdfKit";
import {
  earningStatus,
  earningTotals,
  REMITTANCE_TEXT,
  type EarningExportRow,
} from "./earningsExport";

/** A PDF this long is unreadable and slow to render — CSV is the tool for bulk data. */
export const MAX_EARNING_PDF_ROWS = 1000;

export async function renderEarningsPdf(input: {
  rows: EarningExportRow[];
  business: Business;
  subtitle: string;
}): Promise<Buffer> {
  const t = earningTotals(input.rows);
  return renderToBuffer(
    <ListDocument
      business={input.business}
      docType="Earnings Statement"
      generatedAt={pdfDate(new Date().toISOString())}
      subtitle={input.subtitle}
      orientation="landscape"
      columns={[
        { label: "Date", flex: 1.2 },
        { label: "Client", flex: 2.2 },
        { label: "Type", flex: 1.4 },
        { label: "Original", flex: 2.2 },
        { label: "Status", flex: 1.5 },
        { label: "Fiscal Year", flex: 1.2 },
        { label: "Amount (BDT)", flex: 1.6, align: "right" },
      ]}
      rows={input.rows.map((r) => [
        pdfDate(r.date),
        r.sourceName,
        REMITTANCE_TEXT[r.remittance],
        r.currency === "BDT" ? "—" : pdfForeign(r.currency, r.originalAmount, r.fxRate),
        earningStatus(r),
        r.fiscalYear,
        pdfAmount(r.amount),
      ])}
      totals={[
        { label: "Remittance", value: pdfAmount(t.remittance) },
        { label: "Non-remittance", value: pdfAmount(t.nonRemittance) },
        { label: "Total income", value: pdfAmount(t.total) },
        ...(t.pendingCount > 0
          ? [
              {
                label: `Of which pending conversion (${t.pendingCount}, indicative rate)`,
                value: pdfAmount(t.pendingBdt),
              },
            ]
          : []),
      ]}
    />
  );
}
