import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getPayments } from "@/services/property";
import { ListDocument, pdfResponse, pdfMoney, pdfDate } from "@/services/finance/pdfKit";
import { getBusinessProfile } from "@/services/admin";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

  const rows = await getPayments({ month, year });
  const totalDue = rows.reduce((sum, r) => sum + r.rentDue, 0);
  const totalPaid = rows.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalOutstanding = rows.reduce((sum, r) => sum + r.balance, 0);
  const period = month && year ? `${MONTHS[month - 1]} ${year}` : "All periods";

  const business = await getBusinessProfile();

  const buffer = await renderToBuffer(
    <ListDocument
      business={business}
      docType="Rent Collection Statement"
      generatedAt={pdfDate(new Date().toISOString())}
      subtitle={period}
      columns={[
        { label: "Tenant", flex: 1.6 },
        { label: "Phone", flex: 1.4 },
        { label: "Unit", flex: 0.9 },
        { label: "Period", flex: 1.3 },
        { label: "Due", flex: 1.1, align: "right" },
        { label: "Paid", flex: 1.1, align: "right" },
        { label: "Balance", flex: 1.1, align: "right" },
        { label: "Status", flex: 0.9, align: "right" },
      ]}
      rows={rows.map((r) => [
        r.tenantName,
        r.tenantPhone || "—",
        r.unitNumber ?? "—",
        `${MONTHS[r.month - 1]} ${r.year}`,
        pdfMoney(r.rentDue),
        pdfMoney(r.amountPaid),
        pdfMoney(r.balance),
        r.status,
      ])}
      totalLabel={`Collected ${pdfMoney(totalPaid)} of ${pdfMoney(totalDue)} — Outstanding`}
      totalValue={pdfMoney(totalOutstanding)}
    />
  );
  return pdfResponse(buffer, `rent-collection-${period.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
