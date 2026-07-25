import { useCallback, useEffect, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { useMoneyAccounts } from "@/hooks/useMoneyAccounts";
import type { MoneyEntryRow, TripReport } from "@/types";

/** Loads a trip's report + expenses + accounts; `reload` refreshes all three. */
export function useTripDetail(tripId: string) {
  const [report, setReport] = useState<TripReport | null>(null);
  const [expenses, setExpenses] = useState<MoneyEntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { accounts, reload: reloadAccounts } = useMoneyAccounts();

  const loadTrip = useCallback(async () => {
    setLoading(true);
    try {
      const [r, ex] = await Promise.all([
        tripsApi.getReport(tripId),
        tripsApi.listExpenses(tripId),
      ]);
      setReport(r ?? null);
      setExpenses(ex ?? []);
      setNotFound(!r);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  const reload = useCallback(async () => {
    await Promise.all([loadTrip(), reloadAccounts()]);
  }, [loadTrip, reloadAccounts]);

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  return { report, expenses, loading, notFound, accounts, reload };
}
