import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

// Returns a preview of the move-out settlement — does NOT make changes.
// Admin reviews this data and then calls /settle to apply.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { moveOutDate } = await req.json();

  if (!moveOutDate) return Response.json({ error: "moveOutDate is required" }, { status: 400 });

  const tenant = await db.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      tenantCode: true,
      advanceAmount: true,
      advancePaid: true,
      advanceSettled: true,
    },
  });

  if (!tenant) return Response.json({ error: "Not found" }, { status: 404 });
  if (!tenant.advancePaid) return Response.json({ error: "Tenant has no advance on record" }, { status: 400 });

  const advanceBalance = Number(tenant.advanceAmount ?? 0);

  // Get all outstanding (PENDING / PARTIAL / OVERDUE) payments for this tenant
  const outstanding = await db.payment.findMany({
    where: {
      tenantId: id,
      status: { in: ["PENDING", "PARTIAL", "OVERDUE"] },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const outstandingItems = outstanding.map((p) => ({
    id: p.id,
    month: p.month,
    year: p.year,
    rentDue: Number(p.rentDue),
    amountPaid: Number(p.amountPaid),
    advanceApplied: Number(p.advanceApplied),
    balance: Number(p.rentDue) - Number(p.amountPaid) - Number(p.advanceApplied),
    status: p.status,
  }));

  const totalOutstanding = outstandingItems.reduce((sum, p) => sum + p.balance, 0);
  const refundable = Math.max(0, advanceBalance - totalOutstanding);
  const stillOwed = Math.max(0, totalOutstanding - advanceBalance);

  return Response.json({
    data: {
      tenantId: id,
      tenantName: tenant.name,
      tenantCode: tenant.tenantCode,
      moveOutDate,
      advanceBalance,
      totalOutstanding,
      refundable,
      stillOwed,
      outstandingPayments: outstandingItems,
    },
  });
}
