import { useState, useEffect, useCallback } from "react";
import { financeApi } from "@/lib/api/finance";
import type { EarningRow, PaymentRow, SourceRow } from "../../../types";

export function useClientProfile(id: string) {
  const [source, setSource] = useState<SourceRow | null>(null);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sourceData, earningsData, paymentsData] = await Promise.all([
        financeApi.getSource(id),
        financeApi.listEarnings({ sourceIds: [id] }),
        financeApi.listPayments({ clientIds: [id] }),
      ]);
      setSource(sourceData);
      setEarnings(earningsData ?? []);
      setPayments(paymentsData ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalEarned = earnings.reduce((s, e) => s + e.amount, 0);

  return { source, earnings, payments, totalEarned, loading, error, reload: load };
}
