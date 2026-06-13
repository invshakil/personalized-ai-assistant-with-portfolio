import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument, pdfResponse, pdfDate } from "@/services/finance/pdfKit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const e = await db.earning.findUnique({
    where: { id },
    include: { source: { select: { name: true } } },
  });
  if (!e) return Response.json({ error: "Not found" }, { status: 404 });

  const buffer = await renderToBuffer(
    <ReceiptDocument
      docType="Income Receipt"
      generatedAt={pdfDate(new Date().toISOString())}
      fields={[
        { label: "Client / Source", value: e.source.name },
        { label: "Type", value: e.remittance === "REM" ? "Remittance" : "Non-remittance" },
        { label: "Received on", value: pdfDate(e.date.toISOString()) },
        { label: "Fiscal year", value: e.fiscalYear },
      ]}
      amountLabel="Amount received"
      amount={Number(e.amount)}
      leftSignLabel="Received by"
      rightSignLabel="For the record"
      footerNote="This is a computer-generated income receipt."
    />
  );

  const safe = e.source.name.replace(/[^A-Za-z0-9]+/g, "-");
  return pdfResponse(buffer, `income-${safe}-${e.fiscalYear}.pdf`);
}
