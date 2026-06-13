import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument, pdfResponse, pdfDate } from "@/services/finance/pdfKit";

const KIND: Record<string, string> = {
  SALARY: "Salary",
  BONUS: "Bonus",
  ADVANCE: "Advance",
  OTHER: "Other",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const p = await db.employeePayment.findUnique({
    where: { id },
    include: {
      employee: { select: { name: true } },
      clients: { select: { name: true }, orderBy: { name: "asc" } },
    },
  });
  if (!p) return Response.json({ error: "Not found" }, { status: 404 });

  const clientNames = p.clients.map((c) => c.name).join(", ");

  const buffer = await renderToBuffer(
    <ReceiptDocument
      docType="Salary Payment Receipt"
      generatedAt={pdfDate(new Date().toISOString())}
      fields={[
        { label: "Employee", value: p.employee.name },
        { label: "Payment type", value: KIND[p.type] ?? p.type },
        { label: "Client(s)", value: clientNames || "—" },
        ...(p.reference ? [{ label: "Note", value: p.reference }] : []),
        { label: "Payment date", value: pdfDate(p.date.toISOString()) },
        { label: "Fiscal year", value: p.fiscalYear },
      ]}
      amountLabel="Amount paid"
      amount={Number(p.amount)}
      leftSignLabel="Employee signature"
      rightSignLabel="Employer signature"
      footerNote="This is a computer-generated salary receipt."
    />
  );

  const safe = p.employee.name.replace(/\s+/g, "-");
  return pdfResponse(buffer, `salary-${safe}-${p.fiscalYear}.pdf`);
}
