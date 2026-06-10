import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export async function getDashboardStats(month: number, year: number) {
  const [monthPayments, monthExpenses] = await Promise.all([
    db.payment.findMany({
      where: { month, year },
      select: { rentDue: true, amountPaid: true, advanceApplied: true, status: true },
    }),
    db.expense.findMany({ where: { month, year }, select: { amount: true } }),
  ]);

  const totalExpected = monthPayments.reduce((sum, p) => sum + toNum(p.rentDue), 0);
  const totalCollected = monthPayments.reduce((sum, p) => sum + toNum(p.amountPaid) + toNum(p.advanceApplied), 0);
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + toNum(e.amount), 0);
  const overdueCount = monthPayments.filter((p) => p.status === "OVERDUE").length;

  const [activeTenantsCount, occupiedUnits, totalUnits, advanceStats] = await Promise.all([
    db.tenant.count({ where: { isActive: true } }),
    db.unit.count({ where: { isOccupied: true } }),
    db.unit.count(),
    db.tenant.aggregate({
      where: { isActive: true, advancePaid: true },
      _count: { id: true },
      _sum: { advanceAmount: true },
    }),
  ]);

  // Due tracker — aggregate across all unpaid months per tenant
  const duePayments = await db.payment.findMany({
    where: { status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    include: {
      tenant: { select: { id: true, tenantCode: true, name: true } },
      unit: { select: { unitNumber: true } },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  type DueEntry = {
    tenantId: string; tenantCode: string | null; tenantName: string; unitNumber: string | null;
    totalDue: number; monthsUnpaid: number; lastPaidDate: string | null; alert: "OVERDUE" | "PENDING";
  };

  const dueMap = new Map<string, DueEntry>();
  for (const p of duePayments) {
    const balance = toNum(p.rentDue) - toNum(p.amountPaid) - toNum(p.advanceApplied);
    if (balance <= 0) continue;
    const existing = dueMap.get(p.tenantId);
    if (existing) {
      existing.totalDue += balance;
      existing.monthsUnpaid += 1;
      if (p.status === "OVERDUE") existing.alert = "OVERDUE";
    } else {
      dueMap.set(p.tenantId, {
        tenantId: p.tenantId, tenantCode: p.tenant.tenantCode, tenantName: p.tenant.name,
        unitNumber: p.unit?.unitNumber ?? null, totalDue: balance, monthsUnpaid: 1,
        lastPaidDate: null, alert: p.status === "OVERDUE" ? "OVERDUE" : "PENDING",
      });
    }
  }

  // Batch-fetch last paid dates (avoids N+1 query)
  const tenantIds = Array.from(dueMap.keys());
  if (tenantIds.length > 0) {
    const lastPaidPayments = await db.payment.findMany({
      where: { tenantId: { in: tenantIds }, status: { in: ["PAID", "PARTIAL"] } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { tenantId: true, paidDate: true },
      distinct: ["tenantId"],
    });
    for (const p of lastPaidPayments) {
      const entry = dueMap.get(p.tenantId);
      if (entry) entry.lastPaidDate = toIso(p.paidDate);
    }
  }

  const topDue = Array.from(dueMap.values()).sort((a, b) => b.totalDue - a.totalDue).slice(0, 10);

  // Yearly trend data
  const [yearPayments, yearExpenses] = await Promise.all([
    db.payment.findMany({ where: { year }, select: { month: true, amountPaid: true, advanceApplied: true } }),
    db.expense.findMany({ where: { year }, select: { month: true, amount: true } }),
  ]);

  const yearlyData = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const collected = yearPayments
      .filter((p) => p.month === m)
      .reduce((sum, p) => sum + toNum(p.amountPaid) + toNum(p.advanceApplied), 0);
    const expenses = yearExpenses.filter((e) => e.month === m).reduce((sum, e) => sum + toNum(e.amount), 0);
    return { month: m, label, collected, expenses, netProfit: collected - expenses };
  });

  // Pending rent changes
  const pendingRentChanges = await db.rentChange.findMany({
    where: { appliedAt: null },
    include: { tenant: { select: { tenantCode: true, name: true } } },
    orderBy: { effectiveDate: "asc" },
  });

  return {
    month, year,
    totalExpected, totalCollected, totalExpenses,
    netProfit: totalCollected - totalExpenses,
    activeTenantsCount, occupiedUnits, totalUnits,
    tenantsWithAdvance: advanceStats._count.id,
    totalAdvanceHeld: toNum(advanceStats._sum.advanceAmount),
    overdueCount,
    yearlyData, topDue,
    pendingRentChanges: pendingRentChanges.map((rc) => ({
      id: rc.id, tenantId: rc.tenantId,
      tenantCode: rc.tenant.tenantCode, tenantName: rc.tenant.name,
      effectiveDate: rc.effectiveDate.toISOString(),
      previousRent: toNum(rc.previousRent), newRent: toNum(rc.newRent),
      reason: rc.reason, appliedAt: null,
    })),
  };
}
