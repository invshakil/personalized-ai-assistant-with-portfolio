import { db } from "@/lib/db";
import { RemittanceType } from "@prisma/client";
import { toNum } from "./_serializers";
import { generateSubscriptionCharges } from "./subscriptions";

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
  byEmployee: { employeeId: string; name: string; byFiscalYear: Record<string, number>; total: number }[];
  bySource: { sourceId: string; name: string; total: number; count: number }[];
  remittance: { rem: number; nonRem: number };
  monthlyIncome: { period: string; amount: number }[]; // "YYYY-MM", oldest first
}

export interface DashboardRange {
  from?: string; // ISO date (inclusive)
  to?: string; // ISO date (inclusive)
}

export async function getFinanceDashboard(range: DashboardRange = {}): Promise<FinanceDashboard> {
  // Keep subscription charges current so reports reflect this month.
  await generateSubscriptionCharges();

  // Same date filter applies to all ledgers (each has a `date` column).
  const dateFilter =
    range.from || range.to
      ? {
          date: {
            ...(range.from && { gte: new Date(range.from) }),
            ...(range.to && { lte: new Date(range.to) }),
          },
        }
      : {};

  const [earningsByFy, paymentsByFy, expensesByFy, paymentsByEmpFy, employees, sources, remitGroups, allEarnings] =
    await Promise.all([
      db.earning.groupBy({ by: ["fiscalYear"], where: dateFilter, _sum: { amount: true } }),
      db.employeePayment.groupBy({ by: ["fiscalYear"], where: dateFilter, _sum: { amount: true } }),
      db.bizExpense.groupBy({ by: ["fiscalYear"], where: dateFilter, _sum: { amount: true } }),
      db.employeePayment.groupBy({
        by: ["employeeId", "fiscalYear"],
        where: dateFilter,
        _sum: { amount: true },
      }),
      db.employee.findMany({ select: { id: true, name: true } }),
      db.earning.groupBy({ by: ["sourceId"], where: dateFilter, _sum: { amount: true }, _count: true }),
      db.earning.groupBy({ by: ["remittance"], where: dateFilter, _sum: { amount: true } }),
      db.earning.findMany({ where: dateFilter, select: { date: true, amount: true } }),
    ]);

  const sourceNames = await db.incomeSource.findMany({ select: { id: true, name: true } });
  const sourceNameById = new Map(sourceNames.map((s) => [s.id, s.name]));
  const empNameById = new Map(employees.map((e) => [e.id, e.name]));

  // Union of all fiscal years present across the three ledgers, newest first.
  const fySet = new Set<string>([
    ...earningsByFy.map((r) => r.fiscalYear),
    ...paymentsByFy.map((r) => r.fiscalYear),
    ...expensesByFy.map((r) => r.fiscalYear),
  ]);
  const fiscalYears = Array.from(fySet).sort().reverse();

  const incomeByFy = new Map(earningsByFy.map((r) => [r.fiscalYear, toNum(r._sum.amount)]));
  const empByFy = new Map(paymentsByFy.map((r) => [r.fiscalYear, toNum(r._sum.amount)]));
  const toolByFy = new Map(expensesByFy.map((r) => [r.fiscalYear, toNum(r._sum.amount)]));

  const pnl = fiscalYears.map((fy) => {
    const income = incomeByFy.get(fy) ?? 0;
    const empCosts = empByFy.get(fy) ?? 0;
    const toolSubs = toolByFy.get(fy) ?? 0;
    const netProfit = income - (empCosts + toolSubs);
    return { fiscalYear: fy, income, empCosts, toolSubs, netProfit, margin: income ? netProfit / income : 0 };
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

  const bySource = sources
    .map((s) => ({
      sourceId: s.sourceId,
      name: sourceNameById.get(s.sourceId) ?? "—",
      total: toNum(s._sum.amount),
      count: s._count,
    }))
    .sort((a, b) => b.total - a.total);

  const remByType = new Map(remitGroups.map((r) => [r.remittance, toNum(r._sum.amount)]));
  const remittance = {
    rem: remByType.get(RemittanceType.REM) ?? 0,
    nonRem: remByType.get(RemittanceType.NON_REM) ?? 0,
  };

  // Monthly income trend, bucketed by calendar YYYY-MM.
  const monthMap = new Map<string, number>();
  for (const e of allEarnings) {
    const key = `${e.date.getFullYear()}-${String(e.date.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, (monthMap.get(key) ?? 0) + toNum(e.amount));
  }
  const monthlyIncome = Array.from(monthMap.entries())
    .map(([period, amount]) => ({ period, amount }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return { fiscalYears, pnl, totals, byEmployee, bySource, remittance, monthlyIncome };
}
