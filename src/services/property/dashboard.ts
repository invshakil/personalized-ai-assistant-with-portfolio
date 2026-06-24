import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export async function getDashboardStats(month: number, year: number) {
  const [monthPayments, monthExpenses] = await Promise.all([
    db.payment.findMany({
      where: { month, year },
      select: { rentDue: true, amountPaid: true, advanceApplied: true, status: true },
    }),
    db.expense.findMany({ where: { month, year }, select: { amount: true } }),
  ]);

  const totalExpected = monthPayments.reduce((sum, p) => sum + toNum(p.rentDue), 0);
  const totalCollected = monthPayments.reduce(
    (sum, p) => sum + toNum(p.amountPaid) + toNum(p.advanceApplied),
    0
  );
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + toNum(e.amount), 0);
  const overdueCount = monthPayments.filter((p) => p.status === "OVERDUE").length;

  // Active tenants & occupancy must reflect the SELECTED month, not "now". The
  // current-state flags (isActive / isOccupied) would count tenants scheduled to
  // move in next month (FUTURE) as active today. Instead, count tenants actually
  // present during the month using the same date conditions paymentGeneration
  // uses to decide who is billed: moved in by month-end, and not moved out / lease
  // ended before the month began.
  const monthStartDate = new Date(year, month - 1, 1);
  const monthEndDate = new Date(year, month, 0); // last day of the month
  const presentThisMonth = {
    moveInDate: { lte: monthEndDate },
    AND: [
      { OR: [{ moveOutDate: null }, { moveOutDate: { gte: monthStartDate } }] },
      { OR: [{ leaseEndDate: null }, { leaseEndDate: { gte: monthStartDate } }] },
    ],
  };

  const [activeTenants, totalUnits, advanceStats] = await Promise.all([
    db.tenant.findMany({ where: presentThisMonth, select: { unitId: true } }),
    db.unit.count(),
    db.tenant.aggregate({
      where: { isActive: true, advancePaid: true },
      _count: { id: true },
      _sum: { advanceAmount: true },
    }),
  ]);

  const activeTenantsCount = activeTenants.length;
  const occupiedUnits = new Set(activeTenants.filter((t) => t.unitId).map((t) => t.unitId)).size;

  // Due tracker — true outstanding per tenant, as of the selected month.
  //
  // carryForward means each month's `rentDue` already folds in the prior month's
  // unpaid balance, so a tenant's real debt is simply the balance of their MOST
  // RECENT payment record — not a sum across months. (Earlier records keep their
  // PENDING/OVERDUE status forever even after the debt is cleared via a later
  // month's payment, so summing or filtering on status over-reports.)
  const allPayments = await db.payment.findMany({
    where: { OR: [{ year: { lt: year } }, { year, month: { lte: month } }] },
    include: {
      tenant: { select: { id: true, tenantCode: true, name: true } },
      unit: { select: { unitNumber: true } },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  type DueEntry = {
    tenantId: string;
    tenantCode: string | null;
    tenantName: string;
    unitNumber: string | null;
    totalDue: number;
    monthsUnpaid: number;
    lastPaidDate: string | null;
    alert: "OVERDUE" | "PENDING";
  };

  // Group each tenant's payments (already sorted ascending by period).
  const byTenant = new Map<string, typeof allPayments>();
  for (const p of allPayments) {
    const arr = byTenant.get(p.tenantId) ?? [];
    arr.push(p);
    byTenant.set(p.tenantId, arr);
  }

  const balanceOf = (p: (typeof allPayments)[number]) =>
    toNum(p.rentDue) - toNum(p.amountPaid) - toNum(p.advanceApplied);

  const dueEntries: DueEntry[] = [];
  for (const pays of byTenant.values()) {
    const latest = pays[pays.length - 1];
    const outstanding = balanceOf(latest);
    if (outstanding <= 0) continue; // fully settled (incl. all carried arrears)

    // Months behind: count consecutive unpaid records back from the latest until
    // a fully-paid month (balance <= 0) resets the carry-forward chain.
    let monthsUnpaid = 0;
    let overdue = false;
    let lastPaidDate: string | null = null;
    for (let i = pays.length - 1; i >= 0; i--) {
      if (balanceOf(pays[i]) > 0) {
        monthsUnpaid += 1;
        if (pays[i].status === "OVERDUE") overdue = true;
      } else {
        lastPaidDate = toIso(pays[i].paidDate);
        break;
      }
    }

    dueEntries.push({
      tenantId: latest.tenantId,
      tenantCode: latest.tenant.tenantCode,
      tenantName: latest.tenant.name,
      unitNumber: latest.unit?.unitNumber ?? null,
      totalDue: Math.round(outstanding),
      monthsUnpaid,
      lastPaidDate,
      alert: overdue ? "OVERDUE" : "PENDING",
    });
  }

  const topDue = dueEntries
    .filter((d) => d.totalDue > 0)
    .sort((a, b) => b.totalDue - a.totalDue)
    .slice(0, 10);

  // Current-month-only dues (matches the "Rent collected this month" stat
  // shown alongside on the admin overview, which is scoped to {month, year}).
  const currentMonthDuePayments = await db.payment.findMany({
    where: { month, year, status: { in: ["PENDING", "OVERDUE", "PARTIAL"] } },
    include: {
      tenant: { select: { id: true, tenantCode: true, name: true } },
      unit: { select: { unitNumber: true } },
    },
  });
  const currentMonthTopDue = currentMonthDuePayments
    .map((p) => {
      const balance = toNum(p.rentDue) - toNum(p.amountPaid) - toNum(p.advanceApplied);
      return {
        tenantId: p.tenantId,
        tenantCode: p.tenant.tenantCode,
        tenantName: p.tenant.name,
        unitNumber: p.unit?.unitNumber ?? null,
        totalDue: balance,
        monthsUnpaid: 1,
        lastPaidDate: null as string | null,
        alert: (p.status === "OVERDUE" ? "OVERDUE" : "PENDING") as "OVERDUE" | "PENDING",
      };
    })
    .filter((d) => d.totalDue > 0)
    .sort((a, b) => b.totalDue - a.totalDue);

  // Yearly trend data
  const [yearPayments, yearExpenses] = await Promise.all([
    db.payment.findMany({
      where: { year },
      select: { month: true, amountPaid: true, advanceApplied: true },
    }),
    db.expense.findMany({ where: { year }, select: { month: true, amount: true } }),
  ]);

  const yearlyData = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    const collected = yearPayments
      .filter((p) => p.month === m)
      .reduce((sum, p) => sum + toNum(p.amountPaid) + toNum(p.advanceApplied), 0);
    const expenses = yearExpenses
      .filter((e) => e.month === m)
      .reduce((sum, e) => sum + toNum(e.amount), 0);
    return { month: m, label, collected, expenses, netProfit: collected - expenses };
  });

  // Scheduled rent changes: any not-yet-applied change for an active tenant.
  // `appliedAt: null` is the "scheduled / upcoming" signal — payment generation
  // sets it once the change takes effect, so anything still null is genuinely
  // pending. Changes for departed tenants are excluded.
  const now = new Date();
  const pendingRentChanges = await db.rentChange.findMany({
    where: {
      appliedAt: null,
      tenant: { isActive: true },
    },
    include: {
      tenant: { select: { tenantCode: true, name: true, unit: { select: { unitNumber: true } } } },
    },
    orderBy: { effectiveDate: "asc" },
  });

  // Recent & upcoming tenant movements — who is moving in (incl. brand-new
  // tenants) and who is moving out, within a window around today.
  const movementStart = new Date(now);
  movementStart.setDate(movementStart.getDate() - 60);
  const movementEnd = new Date(now);
  movementEnd.setDate(movementEnd.getDate() + 180);

  const [moveIns, moveOuts] = await Promise.all([
    db.tenant.findMany({
      where: { moveInDate: { gte: movementStart, lte: movementEnd } },
      select: {
        id: true,
        name: true,
        tenantCode: true,
        moveInDate: true,
        createdAt: true,
        unit: { select: { unitNumber: true } },
      },
      orderBy: { moveInDate: "asc" },
    }),
    db.tenant.findMany({
      where: { moveOutDate: { gte: movementStart, lte: movementEnd } },
      select: {
        id: true,
        name: true,
        tenantCode: true,
        moveOutDate: true,
        unit: { select: { unitNumber: true } },
      },
      orderBy: { moveOutDate: "asc" },
    }),
  ]);

  const tenantMovements = [
    ...moveIns.map((t) => ({
      tenantId: t.id,
      tenantName: t.name,
      tenantCode: t.tenantCode,
      unitNumber: t.unit?.unitNumber ?? null,
      date: t.moveInDate.toISOString(),
      kind: "MOVE_IN" as const,
      timing: (t.moveInDate > now ? "upcoming" : "recent") as "upcoming" | "recent",
      // Brand-new tenant: their record was created around the same time they moved in.
      isNew: t.createdAt >= movementStart,
    })),
    ...moveOuts.map((t) => ({
      tenantId: t.id,
      tenantName: t.name,
      tenantCode: t.tenantCode,
      unitNumber: t.unit?.unitNumber ?? null,
      date: t.moveOutDate!.toISOString(),
      kind: "MOVE_OUT" as const,
      timing: (t.moveOutDate! > now ? "upcoming" : "recent") as "upcoming" | "recent",
      isNew: false,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  return {
    month,
    year,
    totalExpected,
    totalCollected,
    totalExpenses,
    netProfit: totalCollected - totalExpenses,
    activeTenantsCount,
    occupiedUnits,
    totalUnits,
    tenantsWithAdvance: advanceStats._count.id,
    totalAdvanceHeld: toNum(advanceStats._sum.advanceAmount),
    overdueCount,
    yearlyData,
    topDue,
    currentMonthTopDue,
    pendingRentChanges: pendingRentChanges.map((rc) => ({
      id: rc.id,
      tenantId: rc.tenantId,
      tenantCode: rc.tenant.tenantCode,
      tenantName: rc.tenant.name,
      unitNumber: rc.tenant.unit?.unitNumber ?? null,
      effectiveDate: rc.effectiveDate.toISOString(),
      previousRent: toNum(rc.previousRent),
      newRent: toNum(rc.newRent),
      increase: toNum(rc.newRent) - toNum(rc.previousRent),
      reason: rc.reason,
    })),
    tenantMovements,
  };
}
