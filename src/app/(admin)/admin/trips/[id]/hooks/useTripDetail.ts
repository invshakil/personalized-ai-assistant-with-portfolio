import { useCallback, useEffect, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { useMoneyAccounts } from "@/hooks/useMoneyAccounts";
import type { TripExpenseRow, TripParticipantRow, TripReport, TripSettlementRow } from "@/types";

/** Loads a trip's report + expenses + participants + settlements + accounts;
 *  `reload` refreshes everything after any mutation. */
export function useTripDetail(tripId: string) {
  const [report, setReport] = useState<TripReport | null>(null);
  const [expenses, setExpenses] = useState<TripExpenseRow[]>([]);
  const [participants, setParticipants] = useState<TripParticipantRow[]>([]);
  const [settlements, setSettlements] = useState<TripSettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { accounts, reload: reloadAccounts } = useMoneyAccounts();

  const loadTrip = useCallback(async () => {
    setLoading(true);
    try {
      const [r, ex, ps, st] = await Promise.all([
        tripsApi.getReport(tripId),
        tripsApi.listExpenses(tripId),
        tripsApi.listParticipants(tripId),
        tripsApi.listSettlements(tripId),
      ]);
      setReport(r ?? null);
      setExpenses(ex ?? []);
      setParticipants(ps ?? []);
      setSettlements(st ?? []);
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

  return { report, expenses, participants, settlements, loading, notFound, accounts, reload };
}
