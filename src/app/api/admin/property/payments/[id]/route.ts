import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, tenantCode: true, name: true, advanceAmount: true } },
      unit: { select: { id: true, unitNumber: true } },
      transactions: { orderBy: { date: "asc" } },
    },
  });

  if (!payment) return Response.json({ error: "Not found" }, { status: 404 });

  return Response.json({
    data: {
      ...payment,
      rentDue: Number(payment.rentDue),
      amountPaid: Number(payment.amountPaid),
      advanceApplied: Number(payment.advanceApplied),
      balance: Number(payment.rentDue) - Number(payment.amountPaid) - Number(payment.advanceApplied),
      paidDate: payment.paidDate?.toISOString() ?? null,
      tenant: { ...payment.tenant, advanceAmount: Number(payment.tenant.advanceAmount ?? 0) },
      transactions: payment.transactions.map((tx) => ({
        ...tx,
        amount: Number(tx.amount),
        date: tx.date.toISOString(),
        createdAt: tx.createdAt.toISOString(),
      })),
    },
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const payment = await db.payment.update({
    where: { id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status && { status: body.status }),
    },
  });

  return Response.json({
    data: {
      ...payment,
      rentDue: Number(payment.rentDue),
      amountPaid: Number(payment.amountPaid),
      advanceApplied: Number(payment.advanceApplied),
      paidDate: payment.paidDate?.toISOString() ?? null,
    },
  });
}
