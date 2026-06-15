// Property reporting functions — aggregated, tool-friendly summaries for the AI
// assistant. Financial reports accept a flexible date range (period token or
// from/to); operational snapshots are point-in-time. Read-only. Money is BDT.
import { db } from "@/lib/db";
import { toNum } from "./_serializers";
import {
  resolveRange,
  monthYearWhere,
  dateColumnWhere,
  type RangeInput,
} from "@/services/_shared/dateRange";

const mk = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

/** Multi-month rental P&L: expected vs collected, expenses, net, monthly trend. */
export async function getPropertyFinancials(input: RangeInput = {}) {
  const range = resolveRange(input, "last_12_months");
  const where = monthYearWhere(range);

  const [payments, expenses] = await Promise.all([
    db.payment.findMany({
      where,
      select: { rentDue: true, amountPaid: true, advanceApplied: true, month: true, year: true },
    }),
    db.expense.findMany({ where, select: { amount: true, month: true, year: true } }),
  ]);

  const months = new Map<string, { expected: number; collected: number; expenses: number }>();
  const bucket = (k: string) =>
    months.get(k) ?? months.set(k, { expected: 0, collected: 0, expenses: 0 }).get(k)!;
  for (const p of payments) {
    const b = bucket(mk(p.year, p.month));
    b.expected += toNum(p.rentDue);
    b.collected += toNum(p.amountPaid) + toNum(p.advanceApplied);
  }
  for (const e of expenses) bucket(mk(e.year, e.month)).expenses += toNum(e.amount);

  const expected = payments.reduce((s, p) => s + toNum(p.rentDue), 0);
  const collected = payments.reduce((s, p) => s + toNum(p.amountPaid) + toNum(p.advanceApplied), 0);
  const expenseTotal = expenses.reduce((s, e) => s + toNum(e.amount), 0);

  return {
    range: range.label,
    expected,
    collected,
    collectionRatePct: expected ? Math.round((collected / expected) * 1000) / 10 : 0,
    expenses: expenseTotal,
    netProfit: collected - expenseTotal,
    byMonth: Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, ...v, net: v.collected - v.expenses })),
  };
}

/** Property expense breakdown by category + payee, with top items. */
export async function getPropertyExpenseBreakdown(input: RangeInput = {}) {
  const range = resolveRange(input, "this_year");
  const where = monthYearWhere(range);

  const [byCat, top, payees] = await Promise.all([
    db.expense.groupBy({ by: ["category"], where, _sum: { amount: true }, _count: true }),
    db.expense.findMany({
      where,
      orderBy: { amount: "desc" },
      take: 5,
      select: { description: true, amount: true, category: true, month: true, year: true },
    }),
    db.payee.findMany({ select: { id: true, name: true } }),
  ]);
  void payees;

  const total = byCat.reduce((s, r) => s + toNum(r._sum.amount), 0);
  return {
    range: range.label,
    total,
    byCategory: byCat
      .map((r) => ({ category: r.category, amount: toNum(r._sum.amount), count: r._count }))
      .sort((a, b) => b.amount - a.amount),
    topExpenses: top.map((t) => ({
      description: t.description,
      amount: toNum(t.amount),
      category: t.category,
      period: mk(t.year, t.month),
    })),
  };
}

/** How much was paid to each payee (vendor/staff) in the range. */
export async function getPayeeSpendReport(input: RangeInput = {}) {
  const range = resolveRange(input, "this_year");
  const where = monthYearWhere(range);

  const [grouped, payees] = await Promise.all([
    db.expense.groupBy({
      by: ["payeeId"],
      where: { ...where, payeeId: { not: null } },
      _sum: { amount: true },
      _count: true,
    }),
    db.payee.findMany({ select: { id: true, name: true, role: true } }),
  ]);
  const meta = new Map(payees.map((p) => [p.id, p]));

  return {
    range: range.label,
    payees: grouped
      .map((g) => ({
        payee: g.payeeId ? (meta.get(g.payeeId)?.name ?? "—") : "—",
        role: g.payeeId ? (meta.get(g.payeeId)?.role ?? "") : "",
        total: toNum(g._sum.amount),
        count: g._count,
      }))
      .sort((a, b) => b.total - a.total),
  };
}

/** Rent collected by payment method (cash / bank transfer / advance / …). */
export async function getCollectionByMethod(input: RangeInput = {}) {
  const range = resolveRange(input, "last_3_months");
  const grouped = await db.paymentTransaction.groupBy({
    by: ["type"],
    where: dateColumnWhere(range),
    _sum: { amount: true },
    _count: true,
  });
  return {
    range: range.label,
    methods: grouped
      .map((g) => ({ method: g.type, amount: toNum(g._sum.amount), count: g._count }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/** Recurring revenue from add-on services (WiFi, parking, …). Current state. */
export async function getServiceRevenueReport() {
  const rows = await db.tenantService.findMany({
    where: { isActive: true },
    select: { monthlyFee: true, service: { select: { name: true } } },
  });
  const byService = new Map<string, { activeTenants: number; monthlyRevenue: number }>();
  for (const r of rows) {
    const e = byService.get(r.service.name) ?? { activeTenants: 0, monthlyRevenue: 0 };
    e.activeTenants += 1;
    e.monthlyRevenue += toNum(r.monthlyFee);
    byService.set(r.service.name, e);
  }
  const services = Array.from(byService.entries())
    .map(([service, v]) => ({ service, ...v }))
    .sort((a, b) => b.monthlyRevenue - a.monthlyRevenue);
  return {
    totalMonthlyRevenue: services.reduce((s, x) => s + x.monthlyRevenue, 0),
    services,
  };
}

/** Current rent roll: each active tenant's unit, base rent, services, total billing. */
export async function getRentRoll() {
  const tenants = await db.tenant.findMany({
    where: { isActive: true },
    select: {
      name: true,
      tenantCode: true,
      isExternal: true,
      unit: { select: { unitNumber: true, monthlyRent: true } },
      services: {
        where: { isActive: true },
        select: { monthlyFee: true, service: { select: { name: true } } },
      },
    },
    orderBy: { tenantCode: "asc" },
  });

  const rows = tenants.map((t) => {
    const baseRent = t.unit ? toNum(t.unit.monthlyRent) : 0;
    const services = t.services.map((s) => ({ name: s.service.name, fee: toNum(s.monthlyFee) }));
    const serviceTotal = services.reduce((s, x) => s + x.fee, 0);
    return {
      tenant: t.name,
      tenantCode: t.tenantCode,
      unit: t.unit?.unitNumber ?? (t.isExternal ? "external" : "—"),
      baseRent,
      services,
      totalMonthly: baseRent + serviceTotal,
    };
  });

  return {
    totalExpectedMonthly: rows.reduce((s, r) => s + r.totalMonthly, 0),
    tenants: rows,
  };
}

/** Cross-month arrears: who owes, how much, how far behind. */
export async function getArrearsReport() {
  const payments = await db.payment.findMany({
    select: {
      rentDue: true,
      amountPaid: true,
      advanceApplied: true,
      month: true,
      year: true,
      tenant: { select: { name: true, tenantCode: true } },
      unit: { select: { unitNumber: true } },
    },
  });

  const byTenant = new Map<
    string,
    { unit: string; code: string | null; outstanding: number; months: number; oldest: number }
  >();
  for (const p of payments) {
    const balance = toNum(p.rentDue) - toNum(p.amountPaid) - toNum(p.advanceApplied);
    if (balance <= 0) continue;
    const key = p.tenant.name;
    const ord = p.year * 12 + p.month;
    const e = byTenant.get(key) ?? {
      unit: p.unit?.unitNumber ?? "—",
      code: p.tenant.tenantCode,
      outstanding: 0,
      months: 0,
      oldest: ord,
    };
    e.outstanding += balance;
    e.months += 1;
    e.oldest = Math.min(e.oldest, ord);
    byTenant.set(key, e);
  }

  const rows = Array.from(byTenant.entries())
    .map(([tenant, v]) => ({
      tenant,
      tenantCode: v.code,
      unit: v.unit,
      totalOutstanding: Math.round(v.outstanding),
      monthsBehind: v.months,
      oldestUnpaid: mk(Math.floor((v.oldest - 1) / 12), ((v.oldest - 1) % 12) + 1),
    }))
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding);

  return {
    grandTotalOutstanding: rows.reduce((s, r) => s + r.totalOutstanding, 0),
    tenants: rows,
  };
}

/** Total tenant advance currently held, per tenant. */
export async function getAdvanceLiabilityReport() {
  const tenants = await db.tenant.findMany({
    where: { advanceAmount: { gt: 0 } },
    select: {
      name: true,
      tenantCode: true,
      advanceAmount: true,
      unit: { select: { unitNumber: true } },
    },
    orderBy: { advanceAmount: "desc" },
  });
  const byTenant = tenants.map((t) => ({
    tenant: t.name,
    tenantCode: t.tenantCode,
    unit: t.unit?.unitNumber ?? "—",
    advance: toNum(t.advanceAmount),
  }));
  return {
    totalHeld: byTenant.reduce((s, t) => s + t.advance, 0),
    byTenant,
  };
}

/** Occupancy snapshot + the list of vacant units. */
export async function getOccupancyReport() {
  const units = await db.unit.findMany({
    select: { unitNumber: true, floor: true, monthlyRent: true, isOccupied: true },
    orderBy: { unitNumber: "asc" },
  });
  const occupied = units.filter((u) => u.isOccupied).length;
  return {
    totalUnits: units.length,
    occupied,
    vacant: units.length - occupied,
    occupancyPct: units.length ? Math.round((occupied / units.length) * 1000) / 10 : 0,
    vacantUnits: units
      .filter((u) => !u.isOccupied)
      .map((u) => ({ unit: u.unitNumber, floor: u.floor, rent: toNum(u.monthlyRent) })),
  };
}

/** Leases ending (or move-outs scheduled) within `withinDays` (default 90). */
export async function getLeaseExpiryReport(input: { withinDays?: number } = {}) {
  const withinDays = input.withinDays ?? 90;
  const now = new Date();
  const until = new Date();
  until.setDate(until.getDate() + withinDays);

  const tenants = await db.tenant.findMany({
    where: {
      isActive: true,
      OR: [{ leaseEndDate: { gte: now, lte: until } }, { moveOutDate: { gte: now, lte: until } }],
    },
    select: {
      name: true,
      tenantCode: true,
      leaseEndDate: true,
      moveOutDate: true,
      unit: { select: { unitNumber: true } },
    },
  });

  const day = 1000 * 60 * 60 * 24;
  const rows = tenants
    .map((t) => {
      const end = t.moveOutDate ?? t.leaseEndDate!;
      return {
        tenant: t.name,
        tenantCode: t.tenantCode,
        unit: t.unit?.unitNumber ?? "—",
        endDate: end.toISOString().slice(0, 10),
        kind: t.moveOutDate ? "move-out" : "lease end",
        daysUntil: Math.round((end.getTime() - now.getTime()) / day),
      };
    })
    .sort((a, b) => a.daysUntil - b.daysUntil);

  return { withinDays, upcoming: rows };
}

/** Pending (not-yet-applied) scheduled rent changes. */
export async function getScheduledRentChanges() {
  const changes = await db.rentChange.findMany({
    where: { appliedAt: null },
    select: {
      effectiveDate: true,
      previousRent: true,
      newRent: true,
      tenant: { select: { name: true, tenantCode: true, unit: { select: { unitNumber: true } } } },
    },
    orderBy: { effectiveDate: "asc" },
  });
  return {
    pending: changes.map((c) => ({
      tenant: c.tenant.name,
      tenantCode: c.tenant.tenantCode,
      unit: c.tenant.unit?.unitNumber ?? "—",
      effectiveDate: c.effectiveDate.toISOString().slice(0, 10),
      previousRent: toNum(c.previousRent),
      newRent: toNum(c.newRent),
      increase: toNum(c.newRent) - toNum(c.previousRent),
    })),
  };
}

/** Per-tenant statement: month-by-month due/paid with a running balance. */
export async function getTenantStatement(tenantId: string, input: RangeInput = {}) {
  const range = resolveRange(input, "last_12_months");
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true, tenantCode: true, advanceAmount: true },
  });
  if (!tenant) throw new Error("Tenant not found.");

  const payments = await db.payment.findMany({
    where: { tenantId, ...monthYearWhere(range) },
    orderBy: [{ year: "asc" }, { month: "asc" }],
    select: {
      rentDue: true,
      amountPaid: true,
      advanceApplied: true,
      month: true,
      year: true,
      status: true,
    },
  });

  let running = 0;
  const lines = payments.map((p) => {
    const due = toNum(p.rentDue);
    const paid = toNum(p.amountPaid) + toNum(p.advanceApplied);
    running += due - paid;
    return {
      period: mk(p.year, p.month),
      due,
      paid,
      balance: Math.round(running),
      status: p.status,
    };
  });

  return {
    tenant: tenant.name,
    tenantCode: tenant.tenantCode,
    range: range.label,
    advanceHeld: toNum(tenant.advanceAmount),
    totalDue: lines.reduce((s, l) => s + l.due, 0),
    totalPaid: lines.reduce((s, l) => s + l.paid, 0),
    outstanding: Math.max(0, Math.round(running)),
    lines,
  };
}
