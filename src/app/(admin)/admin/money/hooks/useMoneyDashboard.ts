import { useState, useEffect, useCallback } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyDashboardData } from "@/types";
import { MONEY_RANGE_PERIOD, type MoneyRange } from "../format";

export function useMoneyDashboard() {
  const [data, setData] = useState<MoneyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<MoneyRange>("M1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await moneyApi.dashboard({ period: MONEY_RANGE_PERIOD[range] })) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, range, setRange };
}
