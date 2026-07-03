import { useEffect, useMemo, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { ObligationRow } from "@/types";
import { DIR_TO_OBLIGATION, type EntryDir } from "../types";

/**
 * When a person/shop is chosen in the entry form, loads their obligations so we
 * can offer the matching dues to settle. Cleared when no one is selected.
 */
export function useObligationLink(beneficiaryId: string, direction: EntryDir) {
  const [linkObligations, setLinkObligations] = useState<ObligationRow[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!beneficiaryId) {
      setLinkObligations([]);
      return;
    }
    setLinkLoading(true);
    moneyApi
      .getBeneficiary(beneficiaryId)
      .then((detail) => {
        if (!cancelled) setLinkObligations(detail?.obligations ?? []);
      })
      .finally(() => {
        if (!cancelled) setLinkLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [beneficiaryId]);

  // Open dues for the selected person that this entry's direction can settle.
  const linkObligationOptions = useMemo(
    () =>
      linkObligations.filter(
        (o) =>
          o.type === "LOAN" && o.status === "ACTIVE" && o.direction === DIR_TO_OBLIGATION[direction]
      ),
    [linkObligations, direction]
  );

  return { linkObligations, linkLoading, linkObligationOptions };
}
