import { useCallback, useEffect, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import type { TripExpenseRow } from "@/types";

interface AppliedFilters {
  category?: string;
  payerId?: string;
  q?: string;
}

/**
 * The trip's expense list, re-fetched from the API whenever the filters change —
 * filtering happens server-side, never as a client-side slice of a full list.
 *
 * This is the single owner of expense rows: useTripDetail deliberately does NOT
 * load them, so there is only one fetch to keep fresh after a mutation.
 */
export function useTripExpenses(tripId: string, filters: AppliedFilters) {
  const [expenses, setExpenses] = useState<TripExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const { category, payerId, q } = filters;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await tripsApi.listExpenses(tripId, { category, payerId, q });
      setExpenses(rows ?? []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  }, [tripId, category, payerId, q]);

  useEffect(() => {
    load();
  }, [load]);

  return { expenses, loading, reload: load };
}
