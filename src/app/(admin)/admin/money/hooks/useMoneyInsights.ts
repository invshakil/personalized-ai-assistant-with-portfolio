import { useMemo } from "react";
import type { MoneyDashboardData } from "@/types";
import type { TrendPoint } from "../MoneyCharts";

export function useMoneyInsights(data: MoneyDashboardData | null) {
  return useMemo(() => {
    if (!data) return null;

    // ── Blend venture take-home into income (user-chosen behaviour) ──────
    // Property & Financial Tracker net is real earned income tracked in
    // those modules; the personal ledger has no income credits yet, so we
    // surface it here rather than show a misleading ৳0. The service's
    // ledger-truth totals are left untouched — blending lives in this view.
    const recordedIncome = data.totals.income;
    const ventureProperty = data.venture.reduce((s, v) => s + v.propertyNet, 0);
    const ventureBusiness = data.venture.reduce((s, v) => s + v.businessNet, 0);
    const ventureTotal = ventureProperty + ventureBusiness;
    const income = recordedIncome + ventureTotal;
    const expense = data.totals.expense;
    const savings = income - expense;
    const savingsRate = income ? savings / income : 0;

    // Merge ledger months + venture months into one blended trend series.
    const byPeriod = new Map<string, { income: number; expense: number; venture: number }>();
    const ensure = (p: string) =>
      byPeriod.get(p) ?? byPeriod.set(p, { income: 0, expense: 0, venture: 0 }).get(p)!;
    for (const s of data.savings) {
      const r = ensure(s.period);
      r.income += s.income;
      r.expense += s.expense;
    }
    for (const v of data.venture) ensure(v.period).venture += v.propertyNet + v.businessNet;
    const trend: TrendPoint[] = Array.from(byPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, r]) => ({
        period,
        income: r.income + r.venture,
        expense: r.expense,
        savings: r.income + r.venture - r.expense,
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
