import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const tenantId = searchParams.get("tenantId") ?? undefined;

  const payments = await db.payment.findMany({
    where: {
      ...(month && { month }),
      ...(year && { year }),
      ...(tenantId && { tenantId }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { tenant: { name: "asc" } }],
    include: {
      tenant: { select: { id: true, tenantCode: true, name: true, advanceAmount: true } },
      unit: { select: { id: true, unitNumber: true } },
      transactions: { orderBy: { date: "asc" } },
    },
  });

  const data = payments.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    tenantName: p.tenant.name,
    tenantCode: p.tenant.tenantCode,
    advanceBalance: Number(p.tenant.advanceAmount ?? 0),
    unitId: p.unitId,
    unitNumber: p.unit?.unitNumber ?? null,
    month: p.month,
    year: p.year,
    rentDue: Number(p.rentDue),
    amountPaid: Number(p.amountPaid),
    advanceApplied: Number(p.advanceApplied),
    balance: Number(p.rentDue) - Number(p.amountPaid) - Number(p.advanceApplied),
    status: p.status,
    paidDate: p.paidDate?.toISOString() ?? null,
    receiptNumber: p.receiptNumber,
    notes: p.notes,
    transactions: p.transactions.map((tx) => ({
      id: tx.id,
      paymentId: tx.paymentId,
      type: tx.type,
      amount: Number(tx.amount),
      date: tx.date.toISOString(),
      notes: tx.notes,
      createdAt: tx.createdAt.toISOString(),
    })),
  }));

  return Response.json({ data });
}
