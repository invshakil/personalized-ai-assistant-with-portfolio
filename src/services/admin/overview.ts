import { db } from "@/lib/db";
import { fiscalYearOf, fiscalYearRange } from "@/lib/fiscalYear";
import { getDashboardStats } from "@/services/property";
import { getSubscriptionSpendReport } from "@/services/finance";
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

  const [monthIncome, monthEmp, monthExp, fyIncome, fyEmp, fyExp, subs, property] =
    await Promise.all([
      db.earning.aggregate({ where: monthWhere, _sum: { amount: true } }),
      db.employeePayment.aggregate({ where: monthWhere, _sum: { amount: true } }),
      db.bizExpense.aggregate({ where: monthWhere, _sum: { amount: true } }),
      db.earning.aggregate({ where: fyWhere, _sum: { amount: true } }),
      db.employeePayment.aggregate({ where: fyWhere, _sum: { amount: true } }),
      db.bizExpense.aggregate({ where: fyWhere, _sum: { amount: true } }),
      getSubscriptionSpendReport(),
      getDashboardStats(month, year),
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

  const totalDue = property.topDue.reduce((s, d) => s + d.totalDue, 0);

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
      overdueCount: property.overdueCount,
      totalDue,
      topDue: property.topDue.slice(0, 5).map((d) => ({
        tenantName: d.tenantName,
        unitNumber: d.unitNumber,
        totalDue: d.totalDue,
        monthsUnpaid: d.monthsUnpaid,
        alert: d.alert,
      })),
    },
  };
}
