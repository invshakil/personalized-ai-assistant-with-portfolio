import { useState, useEffect, useCallback } from "react";
import { financeApi } from "@/lib/api/finance";
import type { FinanceDashboardData } from "../types";
import { rangeBounds, RANGE_LABELS, type RangePreset } from "../format";

export function useFinanceDashboard() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangePreset>("M1");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = rangeBounds(range);
      const data = await financeApi.dashboard({ from, to });
      setData(data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const { from: rangeFrom, to: rangeTo } = rangeBounds(range);
  const reportPdfHref = `/api/admin/finance/report/pdf?${new URLSearchParams({
    ...(rangeFrom && { from: rangeFrom }),
    ...(rangeTo && { to: rangeTo }),
    label: RANGE_LABELS[range],
  }).toString()}`;

  return { data, loading, error, range, setRange, reportPdfHref };
}
