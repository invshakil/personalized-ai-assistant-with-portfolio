import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { withApiError } from "@/lib/apiRoute";
import { getEntries, ledgerCsvRows, parseEntryQuery } from "@/services/money";
import { MAX_PDF_ROWS, renderLedgerPdf } from "@/services/money/ledgerExportPdf";
import { csvResponse, toCsv } from "@/services/_shared/csv";
import { exportFormatParam, isCrossSiteRequest, rangeText } from "@/services/_shared/listQuery";
import { resolveRange } from "@/services/_shared/dateRange";
import { pdfResponse } from "@/services/finance/pdfKit";
import { getBusinessProfile } from "@/services/admin";

// GET /api/admin/money/entries/export?format=csv|pdf&<the Ledger's filters> —
// the ledger exactly as filtered on screen, with income/expense/net totals.
export const GET = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (isCrossSiteRequest(req.headers)) {
    return Response.json({ error: "Cross-site export requests are not allowed" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = exportFormatParam(searchParams.get("format"));
  if (!format) return Response.json({ error: "format must be csv or pdf" }, { status: 400 });

  // An export is the whole filtered set — a page-size `limit` does not apply.
  const opts = { ...parseEntryQuery(searchParams), limit: undefined };
  const entries = await getEntries(opts);
  const range = resolveRange(opts, "all");
  const period = rangeText(range.from, range.to);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const csv = toCsv(ledgerCsvRows(entries, ["Ledger", `Period: ${period}`]));
    return csvResponse(csv, `ledger-${stamp}.csv`);
  }

  if (entries.length > MAX_PDF_ROWS) {
    return Response.json(
      {
        error: `${entries.length} entries is too many for a PDF (limit ${MAX_PDF_ROWS}). Narrow the filters or export CSV.`,
      },
      { status: 400 }
    );
  }
  const buffer = await renderLedgerPdf({
    entries,
    business: await getBusinessProfile(),
    subtitle: period,
  });
  return pdfResponse(buffer, `ledger-${stamp}.pdf`);
});
