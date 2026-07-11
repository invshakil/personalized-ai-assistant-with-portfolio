import { useMemo } from "react";
import type { MoneyDashboardData } from "@/types";
import type { TrendPoint } from "../MoneyCharts";

export function useMoneyInsights(data: MoneyDashboardData | null) {
  return useMemo(() => {
    if (!data) return null;

    // ── Income & savings are LEDGER TRUTH (no double-count) ──────────────
    // Only money actually recorded as a ledger credit counts as income.
    // Venture take-home (Property + Financial Tracker net) is surfaced as
    // read-only context on its own card and is NOT added here: when that
    // take-home lands in an account you post it to the ledger (via the
    // module's "link to account" action), where it becomes a credit and is
    // counted once — right here. Adding venture on top would count every
    // linked earning twice (once as the ledger credit, once as venture net).
    const recordedIncome = data.totals.income;
    const ventureProperty = data.venture.reduce((s, v) => s + v.propertyNet, 0);
    const ventureBusiness = data.venture.reduce((s, v) => s + v.businessNet, 0);
    const ventureTotal = ventureProperty + ventureBusiness;
    const income = recordedIncome;
    const expense = data.totals.expense;
    const savings = income - expense;
    const savingsRate = income ? savings / income : 0;

    // Ledger-only monthly trend (income = recorded credits, savings = income − expense).
    const byPeriod = new Map<string, { income: number; expense: number }>();
    const ensure = (p: string) =>
      byPeriod.get(p) ?? byPeriod.set(p, { income: 0, expense: 0 }).get(p)!;
    for (const s of data.savings) {
      const r = ensure(s.period);
      r.income += s.income;
      r.expense += s.expense;
    }
    const trend: TrendPoint[] = Array.from(byPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, r]) => ({
        period,
        income: r.income,
        expense: r.expense,
        savings: r.income - r.expense,
      }));

    // Spend insights.
    const cats = data.expenseByCategory;
    const expenseTotal = cats.reduce((s, c) => s + c.total, 0);
    const topCat = cats[0] ?? null;
    const top3 = cats.slice(0, 3).reduce((s, c) => s + c.total, 0);
    const top3Share = expenseTotal ? top3 / expenseTotal : 0;
    const monthsCount =
      new Set([...data.savings.map((s) => s.period), ...data.venture.map((v) => v.period)]).size ||
      1;
    const avgMonthlySpend = expenseTotal / monthsCount;

    const venturePct = ventureTotal ? Math.round((ventureProperty / ventureTotal) * 100) : 0;

    return {
      recordedIncome,
      ventureProperty,
      ventureBusiness,
      ventureTotal,
      income,
      expense,
      savings,
      savingsRate,
      trend,
      cats,
      expenseTotal,
      topCat,
      top3Share,
      monthsCount,
      avgMonthlySpend,
      venturePct,
    };
  }, [data]);
}
