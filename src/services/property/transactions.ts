import { db } from "@/lib/db";
import { toNum } from "./_serializers";
import { TransactionType } from "@prisma/client";

function recalcStatus(rentDue: number, amountPaid: number, advanceApplied: number) {
  const total = amountPaid + advanceApplied;
  if (total >= rentDue) return "PAID" as const;
  if (total > 0) return "PARTIAL" as const;
  return "PENDING" as const;
}

async function assignReceiptIfNeeded(paymentId: string, year: number) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    select: { receiptNumber: true },
  });
  if (payment?.receiptNumber) return;
  const count = await db.payment.count({ where: { year, receiptNumber: { not: null } } });
  const receiptNumber = `RCP-${year}-${String(count + 1).padStart(4, "0")}`;
  await db.payment.update({ where: { id: paymentId }, data: { receiptNumber } });
}

export async function getTransactions(paymentId: string) {
  const transactions = await db.paymentTransaction.findMany({
    where: { paymentId },
    orderBy: { date: "asc" },
  });
  return transactions.map((tx) => ({
    ...tx,
    amount: toNum(tx.amount),
    date: tx.date.toISOString(),
    createdAt: tx.createdAt.toISOString(),
  }));
}

export interface AddTransactionInput {
  paymentId: string;
  type: TransactionType;
  amount: number;
  date: string;
  notes?: string;
}

export async function addTransaction(input: AddTransactionInput) {
  const { paymentId, type, amount, date, notes } = input;

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { tenant: { select: { id: true, advanceAmount: true, unitId: true } } },
  });
  if (!payment) throw new Error("Payment not found");

  const isAdvance = type === TransactionType.ADVANCE_APPLIED;

  if (isAdvance) {
    const currentAdvance = toNum(payment.tenant.advanceAmount);
    if (amount > currentAdvance) {
      throw new Error(`Cannot apply ৳${amount} — only ৳${currentAdvance} advance available`);
    }
  }

  const tx = await db.$transaction(async (prisma) => {
    const transaction = await prisma.paymentTransaction.create({
      data: { paymentId, type, amount, date: new Date(date), notes: notes ?? null },
    });

    const newAmountPaid = isAdvance
      ? toNum(payment.amountPaid)
      : toNum(payment.amountPaid) + amount;
    const newAdvanceApplied = isAdvance
      ? toNum(payment.advanceApplied) + amount
      : toNum(payment.advanceApplied);
    const newStatus = recalcStatus(toNum(payment.rentDue), newAmountPaid, newAdvanceApplied);

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

    if (isAdvance) {
      await prisma.tenant.update({
        where: { id: payment.tenant.id },
        data: { advanceAmount: toNum(payment.tenant.advanceAmount) - amount },
      });
    }

    return transaction;
  });

  const updated = await db.payment.findUnique({
    where: { id: paymentId },
    select: { status: true, year: true },
  });
  if (updated && (updated.status === "PAID" || updated.status === "PARTIAL")) {
    await assignReceiptIfNeeded(paymentId, updated.year);
  }

  return {
    ...tx,
    amount: toNum(tx.amount),
    date: tx.date.toISOString(),
    createdAt: tx.createdAt.toISOString(),
  };
}

export interface UpdateTransactionInput {
  type?: TransactionType;
  amount?: number;
  date?: string;
  notes?: string | null;
}

export async function updateTransaction(txId: string, input: UpdateTransactionInput) {
  const tx = await db.paymentTransaction.findUnique({
    where: { id: txId },
    include: { payment: { include: { tenant: { select: { id: true, advanceAmount: true } } } } },
  });
  if (!tx) throw new Error("Not found");

  const payment = tx.payment;
  const newType = input.type ?? tx.type;
  const newAmount = input.amount ?? toNum(tx.amount);
  const newDate = input.date ? new Date(input.date) : tx.date;
  const newNotes = input.notes !== undefined ? input.notes || null : tx.notes;

  const oldIsAdvance = tx.type === TransactionType.ADVANCE_APPLIED;
  const newIsAdvance = newType === TransactionType.ADVANCE_APPLIED;

  let amountPaidDelta = 0;
  let advanceAppliedDelta = 0;
  let tenantAdvanceDelta = 0;

  if (oldIsAdvance) {
    advanceAppliedDelta -= toNum(tx.amount);
    tenantAdvanceDelta += toNum(tx.amount);
  } else {
    amountPaidDelta -= toNum(tx.amount);
  }

  if (newIsAdvance) {
    const availableAdvance =
      toNum(payment.tenant.advanceAmount) + (oldIsAdvance ? toNum(tx.amount) : 0);
    if (newAmount > availableAdvance) {
      throw new Error(`Cannot apply ৳${newAmount} — only ৳${availableAdvance} advance available`);
    }
    advanceAppliedDelta += newAmount;
    tenantAdvanceDelta -= newAmount;
  } else {
    amountPaidDelta += newAmount;
  }

  const newAmountPaid = toNum(payment.amountPaid) + amountPaidDelta;
  const newAdvanceApplied = toNum(payment.advanceApplied) + advanceAppliedDelta;
  const newStatus = recalcStatus(toNum(payment.rentDue), newAmountPaid, newAdvanceApplied);

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
        data: { advanceAmount: toNum(payment.tenant.advanceAmount) + tenantAdvanceDelta },
      });
    }
  });

  const updated = await db.paymentTransaction.findUnique({ where: { id: txId } });
  if (!updated) throw new Error("Transaction not found after update");
  return {
    ...updated,
    amount: toNum(updated.amount),
    date: updated.date.toISOString(),
    createdAt: updated.createdAt.toISOString(),
  };
}

export async function deleteTransaction(txId: string) {
  const tx = await db.paymentTransaction.findUnique({
    where: { id: txId },
    include: { payment: { include: { tenant: { select: { id: true, advanceAmount: true } } } } },
  });
  if (!tx) throw new Error("Not found");

  const payment = tx.payment;
  const isAdvance = tx.type === TransactionType.ADVANCE_APPLIED;
  const txAmount = toNum(tx.amount);

  const newAmountPaid = isAdvance
    ? toNum(payment.amountPaid)
    : toNum(payment.amountPaid) - txAmount;
  const newAdvanceApplied = isAdvance
    ? toNum(payment.advanceApplied) - txAmount
    : toNum(payment.advanceApplied);
  const newStatus = recalcStatus(toNum(payment.rentDue), newAmountPaid, newAdvanceApplied);

  await db.$transaction(async (prisma) => {
    await prisma.paymentTransaction.delete({ where: { id: txId } });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { amountPaid: newAmountPaid, advanceApplied: newAdvanceApplied, status: newStatus },
    });
    if (isAdvance) {
      await prisma.tenant.update({
        where: { id: payment.tenant.id },
        data: { advanceAmount: toNum(payment.tenant.advanceAmount) + txAmount },
      });
    }
  });

  return { deleted: true };
}
