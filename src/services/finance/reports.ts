// Finance reporting functions — aggregated, tool-friendly summaries for the AI
// assistant. All accept a flexible date range (period token or from/to);
// see services/_shared/dateRange.ts. Read-only. Money is BDT.
import { db } from "@/lib/db";
import { toNum } from "./_serializers";
import { resolveRange, dateColumnWhere, type RangeInput } from "@/services/_shared/dateRange";
import { getRealizedEarnings, monthKey } from "./_realized";

/** Month-by-month P&L (income, costs, net) within a range. Default: last 12 months. */
export async function getMonthlyPnl(input: RangeInput = {}) {
  const range = resolveRange(input, "last_12_months");
  const where = dateColumnWhere(range);

  const [realized, payments, expenses] = await Promise.all([
    getRealizedEarnings(range), // income realized-basis, bucketed by conversion month
    db.employeePayment.findMany({ where, select: { date: true, amount: true } }),
    db.bizExpense.findMany({ where, select: { date: true, amount: true } }),
  ]);

  const buckets = new Map<string, { income: number; empCosts: number; toolSubs: number }>();
  const get = (k: string) =>
    buckets.get(k) ?? buckets.set(k, { income: 0, empCosts: 0, toolSubs: 0 }).get(k)!;
  for (const r of realized) get(r.period).income += r.realizedAmount;
  for (const r of payments) get(monthKey(r.date)).empCosts += toNum(r.amount);
  for (const r of expenses) get(monthKey(r.date)).toolSubs += toNum(r.amount);

  const months = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, v]) => ({
      period,
      ...v,
      netProfit: v.income - v.empCosts - v.toolSubs,
    }));

  return { range: range.label, months };
}

/**
 * Per-client profitability: income minus the employee salaries attributed to
 * that client. A salary payment linked to N clients splits evenly across them.
 */
export async function getClientProfitability(input: RangeInput = {}) {
  const range = resolveRange(input, "this_fiscal_year");
  const where = dateColumnWhere(range);

  const [sources, realized, payments] = await Promise.all([
    db.incomeSource.findMany({ select: { id: true, name: true } }),
    getRealizedEarnings(range), // realized-basis income per client (by conversion date)
    db.employeePayment.findMany({
      where,
      select: { amount: true, clients: { select: { id: true } } },
    }),
  ]);

  const name = new Map(sources.map((s) => [s.id, s.name]));
  const income = new Map<string, number>();
  for (const r of realized)
    income.set(r.sourceId, (income.get(r.sourceId) ?? 0) + r.realizedAmount);

  const attributed = new Map<string, number>();
  for (const p of payments) {
    if (p.clients.length === 0) continue;
    const share = toNum(p.amount) / p.clients.length;
    for (const c of p.clients) attributed.set(c.id, (attributed.get(c.id) ?? 0) + share);
  }

  const ids = new Set<string>([...income.keys(), ...attributed.keys()]);
  const rows = Array.from(ids)
    .map((id) => {
      const inc = income.get(id) ?? 0;
      const sal = Math.round(attributed.get(id) ?? 0);
      const net = inc - sal;
      return {
        client: name.get(id) ?? "—",
        income: inc,
        attributedSalary: sal,
        net,
        marginPct: inc ? Math.round((net / inc) * 1000) / 10 : 0,
      };
    })
    .sort((a, b) => b.net - a.net);

  return { range: range.label, clients: rows };
}

/** Per-employee compensation broken down by payment kind. Default: this FY. */
export async function getEmployeeCostReport(input: RangeInput = {}) {
  const range = resolveRange(input, "this_fiscal_year");
  const where = dateColumnWhere(range);

  const [employees, grouped] = await Promise.all([
    db.employee.findMany({ select: { id: true, name: true } }),
    db.employeePayment.groupBy({ by: ["employeeId", "type"], where, _sum: { amount: true } }),
  ]);
  const name = new Map(employees.map((e) => [e.id, e.name]));

  const byEmp = new Map<
    string,
    { salary: number; bonus: number; advance: number; other: number }
  >();
  for (const g of grouped) {
    const e = byEmp.get(g.employeeId) ?? { salary: 0, bonus: 0, advance: 0, other: 0 };
    const amt = toNum(g._sum.amount);
    if (g.type === "SALARY") e.salary += amt;
    else if (g.type === "BONUS") e.bonus += amt;
    else if (g.type === "ADVANCE") e.advance += amt;
    else e.other += amt;
    byEmp.set(g.employeeId, e);
  }

  const rows = Array.from(byEmp.entries()).map(([id, v]) => ({
    employee: name.get(id) ?? "—",
    ...v,
    total: v.salary + v.bonus + v.advance + v.other,
  }));
  const payroll = rows.reduce((s, r) => s + r.total, 0);
  rows.sort((a, b) => b.total - a.total);

  return {
    range: range.label,
    payroll,
    employees: rows.map((r) => ({
      ...r,
      pctOfPayroll: payroll ? Math.round((r.total / payroll) * 1000) / 10 : 0,
    })),
  };
}

/** Business expense breakdown by category, recurring vs one-off, top items. */
export async function getExpenseBreakdown(input: RangeInput = {}) {
  const range = resolveRange(input, "this_fiscal_year");
  const where = dateColumnWhere(range);

  const [categories, byCat, byRecurring, top] = await Promise.all([
    db.bizExpenseCategory.findMany({ select: { id: true, name: true } }),
    db.bizExpense.groupBy({ by: ["categoryId"], where, _sum: { amount: true }, _count: true }),
    db.bizExpense.groupBy({ by: ["isRecurring"], where, _sum: { amount: true } }),
    db.bizExpense.findMany({
      where,
      orderBy: { amount: "desc" },
      take: 5,
      select: { name: true, amount: true, date: true, isRecurring: true },
    }),
  ]);
  const name = new Map(categories.map((c) => [c.id, c.name]));

  const total = byCat.reduce((s, r) => s + toNum(r._sum.amount), 0);
  return {
    range: range.label,
    total,
    recurringTotal: toNum(byRecurring.find((r) => r.isRecurring)?._sum.amount),
    oneOffTotal: toNum(byRecurring.find((r) => !r.isRecurring)?._sum.amount),
    byCategory: byCat
      .map((r) => ({
        category: name.get(r.categoryId) ?? "—",
        amount: toNum(r._sum.amount),
        count: r._count,
      }))
      .sort((a, b) => b.amount - a.amount),
    topExpenses: top.map((t) => ({
      name: t.name,
      amount: toNum(t.amount),
      date: t.date.toISOString().slice(0, 10),
      recurring: t.isRecurring,
    })),
  };
}

/** Recurring-subscription run-rate and what's active/recently ended (current state). */
export async function getSubscriptionSpendReport() {
  const subs = await db.subscription.findMany({
    include: { category: { select: { name: true } }, rateChanges: true },
  });
  const active = subs.filter((s) => !s.endDate);

  // Current-month effective rate: latest rate change on/before this month, else base.
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const currentRate = (s: (typeof subs)[number]) => {
    let amount = toNum(s.monthlyAmount);
    let best = -Infinity;
    for (const rc of s.rateChanges) {
      const t = new Date(
        rc.effectiveMonth.getFullYear(),
        rc.effectiveMonth.getMonth(),
        1
      ).getTime();
      if (t <= thisMonth && t >= best) {
        best = t;
        amount = toNum(rc.monthlyAmount);
      }
    }
    return amount;
  };

  const monthlyRunRate = active.reduce((s, x) => s + currentRate(x), 0);

  const byCategory = new Map<string, number>();
  for (const s of active) {
    byCategory.set(s.category.name, (byCategory.get(s.category.name) ?? 0) + currentRate(s));
  }

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const endedRecently = subs
    .filter((s) => s.endDate && s.endDate >= cutoff)
    .map((s) => ({ name: s.name, endDate: s.endDate!.toISOString().slice(0, 10) }));

  return {
    activeCount: active.length,
    monthlyRunRate,
    annualizedRunRate: monthlyRunRate * 12,
    byCategory: Array.from(byCategory.entries())
      .map(([category, monthly]) => ({ category, monthly }))
      .sort((a, b) => b.monthly - a.monthly),
    endedRecently,
  };
}

/** Remittance vs non-remittance income — totals, monthly trend, top clients. */
export async function getRemittanceReport(input: RangeInput = {}) {
  const range = resolveRange(input, "this_fiscal_year");

  const [rows, sources] = await Promise.all([
    getRealizedEarnings(range), // realized-basis: REM/non-REM of BDT actually received
    db.incomeSource.findMany({ select: { id: true, name: true } }),
  ]);
  const name = new Map(sources.map((s) => [s.id, s.name]));

  let rem = 0;
  let nonRem = 0;
  const byMonth = new Map<string, { rem: number; nonRem: number }>();
  const byClient = new Map<string, { rem: number; nonRem: number }>();
  for (const r of rows) {
    const amt = r.realizedAmount;
    const isRem = r.remittance === "REM";
    if (isRem) rem += amt;
    else nonRem += amt;
    const mk = r.period;
    const m = byMonth.get(mk) ?? { rem: 0, nonRem: 0 };
    m[isRem ? "rem" : "nonRem"] += amt;
    byMonth.set(mk, m);
    const ck = name.get(r.sourceId) ?? "—";
    const c = byClient.get(ck) ?? { rem: 0, nonRem: 0 };
    c[isRem ? "rem" : "nonRem"] += amt;
    byClient.set(ck, c);
  }
  const total = rem + nonRem;

  return {
    range: range.label,
    rem,
    nonRem,
    remPct: total ? Math.round((rem / total) * 1000) / 10 : 0,
    byMonth: Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, v]) => ({ period, ...v })),
    byClient: Array.from(byClient.entries())
      .map(([client, v]) => ({ client, ...v, total: v.rem + v.nonRem }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10),
  };
}

/** Fiscal-year-over-year comparison with growth deltas (all years). */
export async function getFiscalYearComparison() {
  const allTime = resolveRange({}, "all");
  const [realized, emp, tool] = await Promise.all([
    getRealizedEarnings(allTime), // income by realized (conversion) fiscal year
    db.employeePayment.groupBy({ by: ["fiscalYear"], _sum: { amount: true } }),
    db.bizExpense.groupBy({ by: ["fiscalYear"], _sum: { amount: true } }),
  ]);
  const incMap = new Map<string, number>();
  for (const r of realized)
    incMap.set(r.fiscalYear, (incMap.get(r.fiscalYear) ?? 0) + r.realizedAmount);
  const empMap = new Map(emp.map((r) => [r.fiscalYear, toNum(r._sum.amount)]));
  const toolMap = new Map(tool.map((r) => [r.fiscalYear, toNum(r._sum.amount)]));

  const fys = Array.from(new Set([...incMap.keys(), ...empMap.keys(), ...toolMap.keys()])).sort();

  let prevIncome: number | null = null;
  let prevProfit: number | null = null;
  const pct = (cur: number, prev: number | null) =>
    prev === null || prev === 0 ? null : Math.round(((cur - prev) / Math.abs(prev)) * 1000) / 10;

  const years = fys.map((fy) => {
    const income = incMap.get(fy) ?? 0;
    const costs = (empMap.get(fy) ?? 0) + (toolMap.get(fy) ?? 0);
    const netProfit = income - costs;
    const row = {
      fiscalYear: fy,
      income,
      netProfit,
      margin: income ? Math.round((netProfit / income) * 1000) / 10 : 0,
      incomeGrowthPct: pct(income, prevIncome),
      profitGrowthPct: pct(netProfit, prevProfit),
    };
    prevIncome = income;
    prevProfit = netProfit;
    return row;
  });

  return { years };
}
