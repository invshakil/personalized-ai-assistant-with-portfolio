import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";
import { PaymentStatus } from "@prisma/client";
import { resolveRange, monthYearWhere } from "@/services/_shared/dateRange";

export interface GetPaymentsOptions {
  month?: number;
  year?: number;
  tenantIds?: string[];
  unitIds?: string[];
  /** Relative period token (e.g. "all", "last_3_months") for cross-month views. */
  period?: string;
  /** Explicit range start (YYYY-MM-DD); overrides `period`. */
  from?: string;
  /** Explicit range end (YYYY-MM-DD); overrides `period`. */
  to?: string;
}

export async function getPayments(opts: GetPaymentsOptions) {
  const { month, year, tenantIds, unitIds, period, from, to } = opts;
  // A period/from/to range spans many months → resolve to a month+year `where`.
  // A discrete month+year still filters exactly. They are mutually exclusive in
  // the UI, but if both arrive the explicit month/year wins.
  const rangeWhere =
    period || from || to ? monthYearWhere(resolveRange({ period, from, to }, "all")) : {};
  const payments = await db.payment.findMany({
    where: {
      ...rangeWhere,
      ...(month && { month }),
      ...(year && { year }),
      ...(tenantIds?.length && { tenantId: { in: tenantIds } }),
      ...(unitIds?.length && { unitId: { in: unitIds } }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { tenant: { name: "asc" } }],
    include: {
      tenant: {
        select: {
          id: true,
          tenantCode: true,
          name: true,
          phone: true,
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

  // One-off charges are linked to a payment only by (tenantId, month, year).
  // Fetch every charge for the tenants in this result set once, then map each
  // charge to its billing period rather than issuing a query per row.
  const chargeTenantIds = [...new Set(payments.map((p) => p.tenantId))];
  const [charges, vouchers] = chargeTenantIds.length
    ? await Promise.all([
        db.oneOffCharge.findMany({ where: { tenantId: { in: chargeTenantIds } } }),
        db.voucher.findMany({ where: { tenantId: { in: chargeTenantIds } } }),
      ])
    : [[], []];
  const chargeKey = (tenantId: string, month: number, year: number) =>
    `${tenantId}:${month}:${year}`;
  type BillLine = { id: string; label: string; amount: number; notes: string | null };
  const groupByPeriod = (
    rows: {
      id: string;
      tenantId: string;
      label: string;
      amount: { toNumber(): number };
      notes: string | null;
      month: number;
      year: number;
    }[]
  ) => {
    const map = new Map<string, BillLine[]>();
    for (const r of rows) {
      const key = chargeKey(r.tenantId, r.month, r.year);
      const list = map.get(key) ?? [];
      list.push({ id: r.id, label: r.label, amount: toNum(r.amount), notes: r.notes });
      map.set(key, list);
    }
    return map;
  };
  const chargesByPeriod = groupByPeriod(charges);
  const vouchersByPeriod = groupByPeriod(vouchers);

  return payments.map((p) => ({
    id: p.id,
    tenantId: p.tenantId,
    tenantName: p.tenant.name,
    tenantCode: p.tenant.tenantCode,
    tenantPhone: p.tenant.phone,
    advanceBalance: toNum(p.tenant.advanceAmount),
    services: p.tenant.services.map((s) => ({
      name: s.service.name,
      monthlyFee: toNum(s.monthlyFee),
    })),
    oneOffCharges: chargesByPeriod.get(chargeKey(p.tenantId, p.month, p.year)) ?? [],
    vouchers: vouchersByPeriod.get(chargeKey(p.tenantId, p.month, p.year)) ?? [],
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

  const periodWhere = {
    tenantId: payment.tenantId,
    month: payment.month,
    year: payment.year,
  };
  const [charges, vouchers] = await Promise.all([
    db.oneOffCharge.findMany({ where: periodWhere, orderBy: { createdAt: "asc" } }),
    db.voucher.findMany({ where: periodWhere, orderBy: { createdAt: "asc" } }),
  ]);

  return {
    ...payment,
    oneOffCharges: charges.map((c) => ({
      id: c.id,
      label: c.label,
      amount: toNum(c.amount),
      notes: c.notes,
    })),
    vouchers: vouchers.map((v) => ({
      id: v.id,
      label: v.label,
      amount: toNum(v.amount),
      notes: v.notes,
    })),
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
