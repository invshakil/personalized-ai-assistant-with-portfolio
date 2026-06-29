import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getEarnings } from "@/services/finance";
import {
  ListDocument,
  pdfResponse,
  pdfMoney,
  pdfDate,
  pdfForeign,
} from "@/services/finance/pdfKit";
import { getBusinessProfile } from "@/services/admin";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear") ?? undefined;
  const sourceId = searchParams.get("sourceId") ?? undefined;

  const rows = await getEarnings({ fiscalYear, sourceId });
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const business = await getBusinessProfile();

  const buffer = await renderToBuffer(
    <ListDocument
      business={business}
      docType="Earnings Statement"
      generatedAt={pdfDate(new Date().toISOString())}
      subtitle={fiscalYear ? `FY ${fiscalYear}` : "All fiscal years"}
      columns={[
        { label: "Date", flex: 1.4 },
        { label: "Client", flex: 2 },
        { label: "Type", flex: 1.2 },
        { label: "Original", flex: 1.8 },
        { label: "Fiscal Year", flex: 1.3 },
        { label: "Amount (BDT)", flex: 1.5, align: "right" },
      ]}
      rows={rows.map((r) => [
        pdfDate(r.date),
        r.sourceName,
        r.remittance === "REM" ? "Remittance" : "Non-rem",
        r.currency === "BDT" ? "—" : pdfForeign(r.currency, r.originalAmount, r.fxRate),
        r.fiscalYear,
        pdfMoney(r.amount),
      ])}
      totalLabel="Total income"
      totalValue={pdfMoney(total)}
    />
  );
  return pdfResponse(buffer, `earnings-${fiscalYear ?? "all"}.pdf`);
}
