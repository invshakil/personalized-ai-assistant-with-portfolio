import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getBizExpenses } from "@/services/finance";
import { ListDocument, pdfResponse, pdfMoney, pdfDate } from "@/services/finance/pdfKit";
import { getBusinessProfile } from "@/services/admin";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;

  const rows = await getBizExpenses({ fiscalYear, categoryId });
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const business = await getBusinessProfile();

  const buffer = await renderToBuffer(
    <ListDocument
      business={business}
      docType="Business Expenses Statement"
      generatedAt={pdfDate(new Date().toISOString())}
      subtitle={fiscalYear ? `FY ${fiscalYear}` : "All fiscal years"}
      columns={[
        { label: "Date", flex: 1.3 },
        { label: "Tool / Service", flex: 2 },
        { label: "Category", flex: 1.6 },
        { label: "Recurring", flex: 1.1 },
        { label: "Amount", flex: 1.4, align: "right" },
      ]}
      rows={rows.map((r) => [
        pdfDate(r.date),
        r.name,
        r.categoryName,
        r.subscriptionId ? "Subscription" : r.isRecurring ? "Yes" : "No",
        pdfMoney(r.amount),
      ])}
      totalLabel="Total expenses"
      totalValue={pdfMoney(total)}
    />
  );
  return pdfResponse(buffer, `expenses-${fiscalYear ?? "all"}.pdf`);
}
