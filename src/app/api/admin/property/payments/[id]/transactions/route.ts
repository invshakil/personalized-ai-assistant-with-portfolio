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

// Auto-generate receipt number for first PAID/PARTIAL transition
async function assignReceiptIfNeeded(paymentId: string, year: number) {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, select: { receiptNumber: true } });
  if (payment?.receiptNumber) return;

  const count = await db.payment.count({
    where: { year, receiptNumber: { not: null } },
  });
  const receiptNumber = `RCP-${year}-${String(count + 1).padStart(4, "0")}`;
  await db.payment.update({ where: { id: paymentId }, data: { receiptNumber } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const transactions = await db.paymentTransaction.findMany({
    where: { paymentId: id },
    orderBy: { date: "asc" },
  });

  return Response.json({
    data: transactions.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
      date: tx.date.toISOString(),
      createdAt: tx.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id: paymentId } = await params;
  const body = await req.json();
  const { type, amount, date, notes } = body as {
    type: TransactionType;
    amount: number;
    date: string;
    notes?: string;
  };

  if (!type || !amount || !date) {
    return Response.json({ error: "type, amount, and date are required" }, { status: 400 });
  }

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { tenant: { select: { id: true, advanceAmount: true, unitId: true } } },
  });
  if (!payment) return Response.json({ error: "Payment not found" }, { status: 404 });

  const isAdvance = type === TransactionType.ADVANCE_APPLIED;

  // Validate advance application
  if (isAdvance) {
    const currentAdvance = Number(payment.tenant.advanceAmount ?? 0);
    if (amount > currentAdvance) {
      return Response.json(
        { error: `Cannot apply ৳${amount} — only ৳${currentAdvance} advance available` },
        { status: 400 }
      );
    }
  }

  const tx = await db.$transaction(async (prisma) => {
    const transaction = await prisma.paymentTransaction.create({
      data: { paymentId, type, amount, date: new Date(date), notes: notes ?? null },
    });

    const newAmountPaid = isAdvance
      ? Number(payment.amountPaid)
      : Number(payment.amountPaid) + amount;
    const newAdvanceApplied = isAdvance
      ? Number(payment.advanceApplied) + amount
      : Number(payment.advanceApplied);
    const newStatus = recalcStatus(Number(payment.rentDue), newAmountPaid, newAdvanceApplied);

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amountPaid: newAmountPaid,
        advanceApplied: newAdvanceApplied,
        status: newStatus,
        paidDate:
          newStatus === "PAID" || newStatus === "PARTIAL" ? new Date(date) : payment.paidDate,
      },
    });

    // Reduce tenant's advance balance if advance was applied
    if (isAdvance) {
      await prisma.tenant.update({
        where: { id: payment.tenant.id },
        data: { advanceAmount: Number(payment.tenant.advanceAmount ?? 0) - amount },
      });
    }

    return transaction;
  });

  // Assign receipt number if now paid/partial
  const updated = await db.payment.findUnique({ where: { id: paymentId }, select: { status: true, year: true } });
  if (updated && (updated.status === "PAID" || updated.status === "PARTIAL")) {
    await assignReceiptIfNeeded(paymentId, updated.year);
  }

  return Response.json({
    data: { ...tx, amount: Number(tx.amount), date: tx.date.toISOString(), createdAt: tx.createdAt.toISOString() },
  }, { status: 201 });
}
