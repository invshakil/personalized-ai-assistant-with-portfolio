import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { TransactionType } from "@prisma/client";

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

  const existing = await db.payment.findUnique({
    where: { id },
    select: { amountPaid: true, advanceApplied: true },
  });
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  // Recalculate status when rentDue is being updated
  let recalcedStatus: string | undefined;
  if (body.rentDue !== undefined) {
    const newRentDue = Number(body.rentDue);
    const total = Number(existing.amountPaid) + Number(existing.advanceApplied);
    if (total >= newRentDue) recalcedStatus = "PAID";
    else if (total > 0) recalcedStatus = "PARTIAL";
    else recalcedStatus = "PENDING";
  }

  const payment = await db.payment.update({
    where: { id },
    data: {
      ...(body.notes !== undefined && { notes: body.notes }),
      ...(body.status && { status: body.status }),
      ...(body.rentDue !== undefined && { rentDue: Number(body.rentDue), status: recalcedStatus }),
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

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      transactions: true,
      tenant: { select: { id: true, advanceAmount: true } },
    },
  });
  if (!payment) return Response.json({ error: "Not found" }, { status: 404 });

  const advanceRestored = payment.transactions
    .filter((tx) => tx.type === TransactionType.ADVANCE_APPLIED)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  await db.$transaction(async (prisma) => {
    await prisma.paymentTransaction.deleteMany({ where: { paymentId: id } });
    await prisma.payment.delete({ where: { id } });
    if (advanceRestored > 0) {
      await prisma.tenant.update({
        where: { id: payment.tenant.id },
        data: { advanceAmount: Number(payment.tenant.advanceAmount ?? 0) + advanceRestored },
      });
    }
  });

  return Response.json({ data: { deleted: true } });
}
