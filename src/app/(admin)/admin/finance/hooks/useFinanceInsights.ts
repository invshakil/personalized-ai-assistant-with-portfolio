import { useMemo } from "react";
import type { FinanceDashboardData } from "../types";

export function useFinanceInsights(data: FinanceDashboardData | null) {
  return useMemo(() => {
    if (!data) return null;

    const { totals } = data;
    const monthly = data.monthlyIncome;
    const monthsTracked = monthly.length;
    const avgMonthly = monthsTracked ? totals.income / monthsTracked : 0;
    const bestMonth = monthly.reduce<{ period: string; amount: number } | null>(
      (best, m) => (best && best.amount >= m.amount ? best : m),
      null
    );
    const latest = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    const mom = latest && prev && prev.amount ? (latest.amount - prev.amount) / prev.amount : null;

    const clients = [...data.bySource].sort((a, b) => b.total - a.total);
    const topClient = clients[0] ?? null;
    const clientConcentration = topClient && totals.income ? topClient.total / totals.income : 0;

    return {
      monthsTracked,
      avgMonthly,
      bestMonth,
      latest,
      prev,
      mom,
      clients,
      topClient,
      clientConcentration,
    };
  }, [data]);
}
