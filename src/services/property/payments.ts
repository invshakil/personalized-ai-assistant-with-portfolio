import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";
import { PaymentStatus } from "@prisma/client";

export async function getPayments(opts: { month?: number; year?: number; tenantId?: string }) {
  const { month, year, tenantId } = opts;
  const payments = await db.payment.findMany({
    where: {
      ...(month && { month }),
      ...(year && { year }),
      ...(tenantId && { tenantId }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { tenant: { name: "asc" } }],
    include: {
      tenant: {
        select: {
          id: true,
          tenantCode: true,
          name: true,
          advanceAmount: true,
          services: {
            where: { isActive: true },
            select: { id: true, monthlyFee: true, service: { select: { name: true } } },
          },
        },
      },
      unit: { select: { id: true, unitNumber: true } },
      transactions: { orderBy: { date: "asc" } },
    },
  });

  return payments.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    tenantName: p.tenant.name,
    tenantCode: p.tenant.tenantCode,
    advanceBalance: toNum(p.tenant.advanceAmount),
    services: p.tenant.services.map((s) => ({
      name: s.service.name,
      monthlyFee: toNum(s.monthlyFee),
    })),
    unitId: p.unitId,
    unitNumber: p.unit?.unitNumber ?? null,
    month: p.month,
    year: p.year,
    rentDue: toNum(p.rentDue),
    amountPaid: toNum(p.amountPaid),
    advanceApplied: toNum(p.advanceApplied),
    carryForward: toNum(p.carryForward),
    balance: toNum(p.rentDue) - toNum(p.amountPaid) - toNum(p.advanceApplied),
    status: p.status,
    paidDate: toIso(p.paidDate),
    receiptNumber: p.receiptNumber,
    notes: p.notes,
    transactions: p.transactions.map((tx) => ({
      id: tx.id,
      paymentId: tx.paymentId,
      type: tx.type,
      amount: toNum(tx.amount),
      date: tx.date.toISOString(),
      notes: tx.notes,
      createdAt: tx.createdAt.toISOString(),
    })),
  }));
}

export async function getPayment(id: string) {
  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      tenant: { select: { id: true, tenantCode: true, name: true, advanceAmount: true } },
      unit: { select: { id: true, unitNumber: true } },
      transactions: { orderBy: { date: "asc" } },
    },
  });

  if (!payment) return null;

  return {
    ...payment,
    rentDue: toNum(payment.rentDue),
    amountPaid: toNum(payment.amountPaid),
    advanceApplied: toNum(payment.advanceApplied),
    carryForward: toNum(payment.carryForward),
    balance: toNum(payment.rentDue) - toNum(payment.amountPaid) - toNum(payment.advanceApplied),
    paidDate: toIso(payment.paidDate),
    tenant: { ...payment.tenant, advanceAmount: toNum(payment.tenant.advanceAmount) },
    transactions: payment.transactions.map((tx) => ({
      ...tx,
      amount: toNum(tx.amount),
      date: tx.date.toISOString(),
      createdAt: tx.createdAt.toISOString(),
    })),
  };
}

export interface UpdatePaymentInput {
  notes?: string | null;
  status?: PaymentStatus;
  rentDue?: number;
}

export async function updatePayment(id: string, input: UpdatePaymentInput) {
  const existing = await db.payment.findUnique({
    where: { id },
    select: { amountPaid: true, advanceApplied: true },
  });
  if (!existing) throw new Error("Not found");

  let recalcedStatus: PaymentStatus | undefined;
  if (input.rentDue !== undefined) {
    const total = toNum(existing.amountPaid) + toNum(existing.advanceApplied);
    recalcedStatus =
      total >= input.rentDue
        ? PaymentStatus.PAID
        : total > 0
          ? PaymentStatus.PARTIAL
          : PaymentStatus.PENDING;
  }

  const payment = await db.payment.update({
    where: { id },
    data: {
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.status && { status: input.status }),
      ...(input.rentDue !== undefined && { rentDue: input.rentDue, status: recalcedStatus }),
    },
  });

  return {
    ...payment,
    rentDue: toNum(payment.rentDue),
    amountPaid: toNum(payment.amountPaid),
    advanceApplied: toNum(payment.advanceApplied),
    paidDate: toIso(payment.paidDate),
  };
}

export async function deletePayment(id: string) {
  const payment = await db.payment.findUnique({
    where: { id },
    include: {
      transactions: true,
      tenant: { select: { id: true, advanceAmount: true } },
    },
  });
  if (!payment) throw new Error("Not found");

  const advanceRestored = payment.transactions
    .filter((tx) => tx.type === "ADVANCE_APPLIED")
    .reduce((sum, tx) => sum + toNum(tx.amount), 0);

  await db.$transaction(async (prisma) => {
    await prisma.paymentTransaction.deleteMany({ where: { paymentId: id } });
    await prisma.payment.delete({ where: { id } });
    if (advanceRestored > 0) {
      await prisma.tenant.update({
        where: { id: payment.tenant.id },
        data: { advanceAmount: toNum(payment.tenant.advanceAmount) + advanceRestored },
      });
    }
  });

  return { deleted: true };
}
