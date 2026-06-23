import { db } from "@/lib/db";
import { fiscalYearOf, fiscalYearRange } from "@/lib/fiscalYear";
import { getDashboardStats } from "@/services/property";
import { getSubscriptionSpendReport } from "@/services/finance";
import { getPersonalSavings } from "@/services/money/dashboard";
import { listAccountsWithBalances } from "@/services/money/accounts";
import { getBeneficiaries } from "@/services/money/beneficiaries";
import { toNum } from "@/services/money/_serializers";
import type { AdminOverview } from "@/types";

const num = (v: { toNumber(): number } | number | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === "object" && "toNumber" in v) return v.toNumber();
  return Number(v);
};

/**
 * Cross-domain snapshot for the admin Overview page: business (Financial
 * Tracker) and property figures for the current month + fiscal year, the
 * subscription run-rate, and the top outstanding property dues. Read-only.
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const now = new Date();
  const month = now.getMonth() + 1; // 1–12
  const year = now.getFullYear();
  const monthStart = new Date(year, now.getMonth(), 1);
  const monthEnd = new Date(year, now.getMonth() + 1, 0, 23, 59, 59, 999);
  const fy = fiscalYearOf(now);
  const { start: fyStart, end: fyEnd } = fiscalYearRange(fy);

  const monthWhere = { date: { gte: monthStart, lte: monthEnd } };
  const fyWhere = { date: { gte: fyStart, lte: fyEnd } };

  const [
    monthIncome,
    monthEmp,
    monthExp,
    fyIncome,
    fyEmp,
    fyExp,
    subs,
    property,
    moneySavings,
    moneyAccounts,
    moneyBeneficiaries,
    monthExpenseRows,
  ] = await Promise.all([
    db.earning.aggregate({ where: monthWhere, _sum: { amount: true } }),
    db.employeePayment.aggregate({ where: monthWhere, _sum: { amount: true } }),
    db.bizExpense.aggregate({ where: monthWhere, _sum: { amount: true } }),
    db.earning.aggregate({ where: fyWhere, _sum: { amount: true } }),
    db.employeePayment.aggregate({ where: fyWhere, _sum: { amount: true } }),
    db.bizExpense.aggregate({ where: fyWhere, _sum: { amount: true } }),
    getSubscriptionSpendReport(),
    getDashboardStats(month, year),
    getPersonalSavings({ period: "this_month" }),
    listAccountsWithBalances(),
    getBeneficiaries(),
    db.moneyEntry.findMany({
      where: { date: { gte: monthStart, lte: monthEnd }, direction: "DEBIT" },
      select: { amount: true, category: { select: { id: true, name: true, kind: true } } },
    }),
  ]);

  const monthBiz = {
    income: num(monthIncome._sum.amount),
    costs: num(monthEmp._sum.amount) + num(monthExp._sum.amount),
    expenses: num(monthExp._sum.amount),
    salaries: num(monthEmp._sum.amount),
  };
  const fyBiz = {
    income: num(fyIncome._sum.amount),
    costs: num(fyEmp._sum.amount) + num(fyExp._sum.amount),
    expenses: num(fyExp._sum.amount),
    salaries: num(fyEmp._sum.amount),
  };

  // Current-month dues only — historic cumulative dues live on the property
  // dashboard page. Keeps the overview internally consistent with the
  // "Rent collected this month" figure shown alongside.
  const totalDue = property.currentMonthTopDue.reduce((s, d) => s + d.totalDue, 0);
  const currentMonthOverdueCount = property.currentMonthTopDue.length;

  // Money Manager — personal ledger snapshot for the current month.
  const cashPosition = moneyAccounts
    .filter((a) => a.type !== "CREDIT_CARD")
    .reduce((s, a) => s + a.balance, 0);
  const cardDebt = moneyAccounts
    .filter((a) => a.type === "CREDIT_CARD")
    .reduce((s, a) => s + Math.max(0, -a.balance), 0);
  const peopleOwed = moneyBeneficiaries.reduce(
    (acc, b) => ({
      owedByMe: acc.owedByMe + b.outstandingByMe,
      owedToMe: acc.owedToMe + b.outstandingToMe,
    }),
    { owedByMe: 0, owedToMe: 0 }
  );
  const catTotals = new Map<string, { name: string; total: number }>();
  for (const e of monthExpenseRows) {
    if (e.category?.kind !== "EXPENSE") continue;
    const slot = catTotals.get(e.category.id) ?? { name: e.category.name, total: 0 };
    slot.total += toNum(e.amount);
    catTotals.set(e.category.id, slot);
  }
  const [topCatEntry] = Array.from(catTotals.entries()).sort(([, a], [, b]) => b.total - a.total);
  const topCategory = topCatEntry
    ? { id: topCatEntry[0], name: topCatEntry[1].name, total: topCatEntry[1].total }
    : null;

  return {
    monthLabel: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
    fiscalYear: fy,
    finance: {
      month: { ...monthBiz, net: monthBiz.income - monthBiz.costs },
      fiscalYear: { ...fyBiz, net: fyBiz.income - fyBiz.costs },
      subscriptionRunRate: subs.monthlyRunRate,
      subscriptionCount: subs.activeCount,
    },
    property: {
      collected: property.totalCollected,
      expected: property.totalExpected,
      expenses: property.totalExpenses,
      net: property.netProfit,
      occupiedUnits: property.occupiedUnits,
      totalUnits: property.totalUnits,
      overdueCount: currentMonthOverdueCount,
      totalDue,
      topDue: property.currentMonthTopDue.slice(0, 5).map((d) => ({
        tenantName: d.tenantName,
        unitNumber: d.unitNumber,
        totalDue: d.totalDue,
        monthsUnpaid: d.monthsUnpaid,
        alert: d.alert,
      })),
    },
    money: {
      income: moneySavings.totals.income,
      expense: moneySavings.totals.expense,
      savings: moneySavings.totals.savings,
      savingsRate: moneySavings.totals.savingsRate,
      cashPosition,
      cardDebt,
      owedByMe: peopleOwed.owedByMe,
      owedToMe: peopleOwed.owedToMe,
      topCategory,
    },
  };
}
