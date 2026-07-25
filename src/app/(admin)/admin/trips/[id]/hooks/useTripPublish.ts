import { useCallback, useState } from "react";
import { tripsApi } from "@/lib/api/trips";

/** Toggle the trip's public shareable page. */
export function useTripPublish(tripId: string, reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(
    async (makePublic: boolean) => {
      setBusy(true);
      try {
        if (makePublic) await tripsApi.publish(tripId);
        else await tripsApi.unpublish(tripId);
        await reload();
      } finally {
        setBusy(false);
      }
    },
    [tripId, reload]
  );

  return { busy, toggle };
}
