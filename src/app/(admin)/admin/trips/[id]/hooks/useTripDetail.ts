import { useCallback, useEffect, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { useMoneyAccounts } from "@/hooks/useMoneyAccounts";
import type { TripParticipantRow, TripReport, TripSettlementRow } from "@/types";

/** Loads a trip's report + participants + settlements + accounts; `reload`
 *  refreshes them after any mutation. Expenses are deliberately NOT loaded here —
 *  they are filtered server-side and owned by useTripExpenses, so keeping a second
 *  copy in this hook would mean one of them silently going stale. */
export function useTripDetail(tripId: string) {
  const [report, setReport] = useState<TripReport | null>(null);
  const [participants, setParticipants] = useState<TripParticipantRow[]>([]);
  const [settlements, setSettlements] = useState<TripSettlementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { accounts, reload: reloadAccounts } = useMoneyAccounts();

  const loadTrip = useCallback(async () => {
    setLoading(true);
    try {
      const [r, ps, st] = await Promise.all([
        tripsApi.getReport(tripId),
        tripsApi.listParticipants(tripId),
        tripsApi.listSettlements(tripId),
      ]);
      setReport(r ?? null);
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

  return { report, participants, settlements, loading, notFound, accounts, reload };
}
