import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReceiptDocument, pdfResponse, pdfDate } from "@/services/finance/pdfKit";
import { getBusinessProfile } from "@/services/admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const x = await db.bizExpense.findUnique({
    where: { id },
    include: { category: { select: { name: true } } },
  });
  if (!x) return Response.json({ error: "Not found" }, { status: 404 });

  const business = await getBusinessProfile();
  const buffer = await renderToBuffer(
    <ReceiptDocument
      business={business}
      docType="Expense Voucher"
      generatedAt={pdfDate(new Date().toISOString())}
      fields={[
        { label: "Tool / Service", value: x.name },
        { label: "Category", value: x.category.name },
        {
          label: "Recurring",
          value: x.subscriptionId ? "Subscription charge" : x.isRecurring ? "Yes" : "No",
        },
        { label: "Date", value: pdfDate(x.date.toISOString()) },
        { label: "Fiscal year", value: x.fiscalYear },
      ]}
      amountLabel="Amount"
      amount={Number(x.amount)}
      leftSignLabel="Paid by"
      rightSignLabel="Authorised by"
      footerNote="This is a computer-generated expense voucher."
    />
  );

  const safe = x.name.replace(/[^A-Za-z0-9]+/g, "-");
  return pdfResponse(buffer, `expense-${safe}-${x.fiscalYear}.pdf`);
}
