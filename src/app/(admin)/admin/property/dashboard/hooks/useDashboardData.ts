import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PropertyDashboardStats } from "@/types";

export function useDashboardData(month: number, year: number) {
  const [data, setData] = useState<PropertyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await propertyApi.dashboard({ month, year })) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error };
}
