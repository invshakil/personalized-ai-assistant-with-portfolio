import { db } from "@/lib/db";
import { RemittanceType } from "@prisma/client";
import { toNum } from "./_serializers";
import { generateSubscriptionCharges } from "./subscriptions";
import { resolveRange, dateColumnWhere } from "@/services/_shared/dateRange";
import { getRealizedEarnings } from "./_realized";

export interface FinanceDashboard {
  fiscalYears: string[];
  pnl: {
    fiscalYear: string;
    income: number;
    empCosts: number;
    toolSubs: number;
    netProfit: number;
    margin: number; // 0–1
  }[];
  totals: { income: number; empCosts: number; toolSubs: number; netProfit: number; margin: number };
  byEmployee: {
    employeeId: string;
    name: string;
    byFiscalYear: Record<string, number>;
    total: number;
  }[];
  bySource: { sourceId: string; name: string; total: number; count: number }[];
  remittance: { rem: number; nonRem: number };
  monthlyIncome: { period: string; amount: number }[]; // "YYYY-MM", oldest first
  // Foreign income earned but not yet converted to BDT (excluded from income above).
  pendingForeign: { currency: string; original: number; count: number }[];
}

export interface DashboardRange {
  from?: string; // ISO date (inclusive)
  to?: string; // ISO date (inclusive)
}

export async function getFinanceDashboard(range: DashboardRange = {}): Promise<FinanceDashboard> {
  // Keep subscription charges current so reports reflect this month.
  await generateSubscriptionCharges();

  // Income is realized-basis: foreign earnings count only once converted, in the
  // conversion period (realizedAt). Costs (payments/expenses) stay on their `date`.
  const resolved = resolveRange({ from: range.from, to: range.to }, "all");
  const dateFilter = dateColumnWhere(resolved);

  const [realized, paymentsByFy, expensesByFy, paymentsByEmpFy, employees, pendingRows] =
    await Promise.all([
      getRealizedEarnings(resolved),
      db.employeePayment.groupBy({ by: ["fiscalYear"], where: dateFilter, _sum: { amount: true } }),
      db.bizExpense.groupBy({ by: ["fiscalYear"], where: dateFilter, _sum: { amount: true } }),
      db.employeePayment.groupBy({
        by: ["employeeId", "fiscalYear"],
        where: dateFilter,
        _sum: { amount: true },
      }),
      db.employee.findMany({ select: { id: true, name: true } }),
      db.earning.groupBy({
        by: ["currency"],
        where: { realizedAt: null, currency: { not: "BDT" } },
        _sum: { originalAmount: true },
        _count: true,
      }),
    ]);

  const sourceNames = await db.incomeSource.findMany({ select: { id: true, name: true } });
  const sourceNameById = new Map(sourceNames.map((s) => [s.id, s.name]));
  const empNameById = new Map(employees.map((e) => [e.id, e.name]));

  // Bucket realized income (by realizedAt) for FY P&L, by-client, remittance, and month.
  const incomeByFy = new Map<string, number>();
  const bySourceMap = new Map<string, { total: number; count: number }>();
  const remByType = new Map<RemittanceType, number>();
  const monthMap = new Map<string, number>();
  for (const r of realized) {
    incomeByFy.set(r.fiscalYear, (incomeByFy.get(r.fiscalYear) ?? 0) + r.realizedAmount);
    const s = bySourceMap.get(r.sourceId) ?? { total: 0, count: 0 };
    s.total += r.realizedAmount;
    s.count += 1;
    bySourceMap.set(r.sourceId, s);
    remByType.set(r.remittance, (remByType.get(r.remittance) ?? 0) + r.realizedAmount);
    monthMap.set(r.period, (monthMap.get(r.period) ?? 0) + r.realizedAmount);
  }

  // Union of all fiscal years present across realized income + the two cost ledgers.
  const fySet = new Set<string>([
    ...incomeByFy.keys(),
    ...paymentsByFy.map((r) => r.fiscalYear),
    ...expensesByFy.map((r) => r.fiscalYear),
  ]);
  const fiscalYears = Array.from(fySet).sort().reverse();

  const empByFy = new Map(paymentsByFy.map((r) => [r.fiscalYear, toNum(r._sum.amount)]));
  const toolByFy = new Map(expensesByFy.map((r) => [r.fiscalYear, toNum(r._sum.amount)]));

  const pnl = fiscalYears.map((fy) => {
    const income = incomeByFy.get(fy) ?? 0;
    const empCosts = empByFy.get(fy) ?? 0;
    const toolSubs = toolByFy.get(fy) ?? 0;
    const netProfit = income - (empCosts + toolSubs);
    return {
      fiscalYear: fy,
      income,
      empCosts,
      toolSubs,
      netProfit,
      margin: income ? netProfit / income : 0,
    };
  });

  const totIncome = pnl.reduce((s, r) => s + r.income, 0);
  const totEmp = pnl.reduce((s, r) => s + r.empCosts, 0);
  const totTool = pnl.reduce((s, r) => s + r.toolSubs, 0);
  const totProfit = totIncome - (totEmp + totTool);
  const totals = {
    income: totIncome,
    empCosts: totEmp,
    toolSubs: totTool,
    netProfit: totProfit,
    margin: totIncome ? totProfit / totIncome : 0,
  };

  // Per-employee × fiscal year matrix + per-employee total.
  const byEmployeeMap = new Map<string, { byFiscalYear: Record<string, number>; total: number }>();
  for (const row of paymentsByEmpFy) {
    const amt = toNum(row._sum.amount);
    const entry = byEmployeeMap.get(row.employeeId) ?? { byFiscalYear: {}, total: 0 };
    entry.byFiscalYear[row.fiscalYear] = amt;
    entry.total += amt;
    byEmployeeMap.set(row.employeeId, entry);
  }
  const byEmployee = Array.from(byEmployeeMap.entries())
    .map(([employeeId, v]) => ({ employeeId, name: empNameById.get(employeeId) ?? "—", ...v }))
    .sort((a, b) => b.total - a.total);

  const bySource = Array.from(bySourceMap.entries())
    .map(([sourceId, v]) => ({
      sourceId,
      name: sourceNameById.get(sourceId) ?? "—",
      total: v.total,
      count: v.count,
    }))
    .sort((a, b) => b.total - a.total);

  const remittance = {
    rem: remByType.get(RemittanceType.REM) ?? 0,
    nonRem: remByType.get(RemittanceType.NON_REM) ?? 0,
  };

  // Monthly realized-income trend (bucketed by conversion month, YYYY-MM).
  const monthlyIncome = Array.from(monthMap.entries())
    .map(([period, amount]) => ({ period, amount }))
    .sort((a, b) => a.period.localeCompare(b.period));

  const pendingForeign = pendingRows
    .map((r) => ({ currency: r.currency, original: toNum(r._sum.originalAmount), count: r._count }))
    .filter((r) => r.original > 0)
    .sort((a, b) => a.currency.localeCompare(b.currency));

  return {
    fiscalYears,
    pnl,
    totals,
    byEmployee,
    bySource,
    remittance,
    monthlyIncome,
    pendingForeign,
  };
}
