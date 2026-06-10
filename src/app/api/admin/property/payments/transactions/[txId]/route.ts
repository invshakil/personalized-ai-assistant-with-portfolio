import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { TransactionType, PaymentStatus } from "@prisma/client";

function recalcStatus(rentDue: number, amountPaid: number, advanceApplied: number): PaymentStatus {
  const total = amountPaid + advanceApplied;
  if (total >= rentDue) return "PAID";
  if (total > 0) return "PARTIAL";
  return "PENDING";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ txId: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { txId } = await params;
  const body = await req.json();
  const { type, amount, date, notes } = body as {
    type?: TransactionType;
    amount?: number;
    date?: string;
    notes?: string;
  };

  const tx = await db.paymentTransaction.findUnique({
    where: { id: txId },
    include: { payment: { include: { tenant: { select: { id: true, advanceAmount: true } } } } },
  });
  if (!tx) return Response.json({ error: "Not found" }, { status: 404 });

  const payment = tx.payment;
  const newType = type ?? tx.type;
  const newAmount = amount ?? Number(tx.amount);
  const newDate = date ? new Date(date) : tx.date;
  const newNotes = notes !== undefined ? (notes || null) : tx.notes;

  const oldIsAdvance = tx.type === TransactionType.ADVANCE_APPLIED;
  const newIsAdvance = newType === TransactionType.ADVANCE_APPLIED;

  // Compute deltas by reversing old effect and applying new effect
  let amountPaidDelta = 0;
  let advanceAppliedDelta = 0;
  let tenantAdvanceDelta = 0;

  if (oldIsAdvance) {
    advanceAppliedDelta -= Number(tx.amount);
    tenantAdvanceDelta += Number(tx.amount);
  } else {
    amountPaidDelta -= Number(tx.amount);
  }

  if (newIsAdvance) {
    const availableAdvance = Number(payment.tenant.advanceAmount ?? 0) + (oldIsAdvance ? Number(tx.amount) : 0);
    if (newAmount > availableAdvance) {
      return Response.json(
        { error: `Cannot apply ৳${newAmount} — only ৳${availableAdvance} advance available` },
        { status: 400 }
      );
    }
    advanceAppliedDelta += newAmount;
    tenantAdvanceDelta -= newAmount;
  } else {
    amountPaidDelta += newAmount;
  }

  const newAmountPaid = Number(payment.amountPaid) + amountPaidDelta;
  const newAdvanceApplied = Number(payment.advanceApplied) + advanceAppliedDelta;
  const newStatus = recalcStatus(Number(payment.rentDue), newAmountPaid, newAdvanceApplied);

  await db.$transaction(async (prisma) => {
    await prisma.paymentTransaction.update({
      where: { id: txId },
      data: { type: newType, amount: newAmount, date: newDate, notes: newNotes },
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { amountPaid: newAmountPaid, advanceApplied: newAdvanceApplied, status: newStatus },
    });
    if (tenantAdvanceDelta !== 0) {
      await prisma.tenant.update({
        where: { id: payment.tenant.id },
        data: { advanceAmount: Number(payment.tenant.advanceAmount ?? 0) + tenantAdvanceDelta },
      });
    }
  });

  const updated = await db.paymentTransaction.findUnique({ where: { id: txId } });
  return Response.json({
    data: {
      ...updated,
      amount: Number(updated!.amount),
      date: updated!.date.toISOString(),
      createdAt: updated!.createdAt.toISOString(),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ txId: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { txId } = await params;

  const tx = await db.paymentTransaction.findUnique({
    where: { id: txId },
    include: { payment: { include: { tenant: { select: { id: true, advanceAmount: true } } } } },
  });
  if (!tx) return Response.json({ error: "Not found" }, { status: 404 });

  const payment = tx.payment;
  const isAdvance = tx.type === TransactionType.ADVANCE_APPLIED;
  const txAmount = Number(tx.amount);

  const newAmountPaid = isAdvance ? Number(payment.amountPaid) : Number(payment.amountPaid) - txAmount;
  const newAdvanceApplied = isAdvance ? Number(payment.advanceApplied) - txAmount : Number(payment.advanceApplied);
  const newStatus = recalcStatus(Number(payment.rentDue), newAmountPaid, newAdvanceApplied);

  await db.$transaction(async (prisma) => {
    await prisma.paymentTransaction.delete({ where: { id: txId } });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { amountPaid: newAmountPaid, advanceApplied: newAdvanceApplied, status: newStatus },
    });
    if (isAdvance) {
      await prisma.tenant.update({
        where: { id: payment.tenant.id },
        data: { advanceAmount: Number(payment.tenant.advanceAmount ?? 0) + txAmount },
      });
    }
  });

  return Response.json({ data: { deleted: true } });
}
