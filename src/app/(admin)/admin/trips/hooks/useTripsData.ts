import { useCallback, useEffect, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import type { TripRow } from "@/types";

/** Owns the trip list (with derived totals). */
export function useTripsData() {
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTrips((await tripsApi.listTrips()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { trips, loading, load };
}
