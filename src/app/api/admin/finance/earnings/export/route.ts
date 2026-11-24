import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { withApiError } from "@/lib/apiRoute";
import { earningCsvRows, getEarnings, parseEarningQuery } from "@/services/finance";
import { MAX_EARNING_PDF_ROWS, renderEarningsPdf } from "@/services/finance/earningsExportPdf";
import { csvResponse, toCsv } from "@/services/_shared/csv";
import { exportFormatParam, isCrossSiteRequest, rangeText } from "@/services/_shared/listQuery";
import { resolveRange } from "@/services/_shared/dateRange";
import { pdfResponse } from "@/services/finance/pdfKit";
import { getBusinessProfile } from "@/services/admin";

// GET /api/admin/finance/earnings/export?format=csv|pdf&<the Earnings filters> —
// the earnings exactly as filtered on screen (client, income type, fiscal year,
// period, search), with remittance / non-remittance / total lines.
export const GET = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  if (isCrossSiteRequest(req.headers)) {
    return Response.json({ error: "Cross-site export requests are not allowed" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const format = exportFormatParam(searchParams.get("format"));
  if (!format) return Response.json({ error: "format must be csv or pdf" }, { status: 400 });

  const opts = parseEarningQuery(searchParams);
  const rows = await getEarnings(opts);
  const range = resolveRange(opts);
  const scope = [
    rangeText(range.from, range.to),
    ...(opts.fiscalYears?.length ? [`FY ${opts.fiscalYears.join(", ")}`] : []),
    ...(opts.remittance
      ? [opts.remittance === "REM" ? "Remittance only" : "Non-remittance only"]
      : []),
  ].join(" · ");
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    return csvResponse(toCsv(earningCsvRows(rows, ["Earnings", scope])), `earnings-${stamp}.csv`);
  }

  if (rows.length > MAX_EARNING_PDF_ROWS) {
    return Response.json(
      {
        error: `${rows.length} earnings is too many for a PDF (limit ${MAX_EARNING_PDF_ROWS}). Narrow the filters or export CSV.`,
      },
      { status: 400 }
    );
  }
  const buffer = await renderEarningsPdf({
    rows,
    business: await getBusinessProfile(),
    subtitle: scope,
  });
  return pdfResponse(buffer, `earnings-${stamp}.pdf`);
});
