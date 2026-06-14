import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getEmployeePayments } from "@/services/finance";
import { ListDocument, pdfResponse, pdfMoney, pdfDate } from "@/services/finance/pdfKit";

const KIND: Record<string, string> = {
  SALARY: "Salary",
  BONUS: "Bonus",
  ADVANCE: "Advance",
  OTHER: "Other",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear") ?? undefined;
  const employeeId = searchParams.get("employeeId") ?? undefined;

  const rows = await getEmployeePayments({ fiscalYear, employeeId });
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const buffer = await renderToBuffer(
    <ListDocument
      docType="Salary Payments Statement"
      generatedAt={pdfDate(new Date().toISOString())}
      subtitle={fiscalYear ? `FY ${fiscalYear}` : "All fiscal years"}
      columns={[
        { label: "Date", flex: 1.3 },
        { label: "Employee", flex: 1.8 },
        { label: "Type", flex: 1 },
        { label: "Client(s)", flex: 2 },
        { label: "Amount", flex: 1.4, align: "right" },
      ]}
      rows={rows.map((r) => [
        pdfDate(r.date),
        r.employeeName,
        KIND[r.type] ?? r.type,
        r.clients.map((c) => c.name).join(", ") || (r.reference ?? "—"),
        pdfMoney(r.amount),
      ])}
      totalLabel="Total paid"
      totalValue={pdfMoney(total)}
    />
  );
  return pdfResponse(buffer, `salaries-${fiscalYear ?? "all"}.pdf`);
}
