import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TripCategory } from "@/types";

export interface TripExpenseFilterState {
  category: TripCategory | "";
  payerId: string;
  q: string;
}

/** How long to wait after the last keystroke before re-querying. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Expense filters for the trip detail page, persisted in the URL so a filtered
 * view survives reload and back-navigation (list page filter standard).
 *
 * The search box is debounced: `q` updates instantly for the input value, while
 * `applied.q` — what the fetch and the URL use — settles after the user stops
 * typing, so we don't fire a request per keystroke.
 */
export function useTripExpenseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const category = (searchParams.get("category") ?? "") as TripCategory | "";
  const payerId = searchParams.get("payerId") ?? "";
  const urlQ = searchParams.get("q") ?? "";

  const [q, setQ] = useState(urlQ);

  // Keep the box in step when the URL changes from outside (back button, a
  // cleared filter). React bails out when the value is already equal, so this
  // doesn't fight the user mid-keystroke.
  useEffect(() => {
    setQ(urlQ);
  }, [urlQ]);

  // Values arrive from dropdowns/inputs as plain strings; the URL is the source
  // of truth and narrows them back on read.
  const setParams = useCallback(
    (next: Partial<Record<keyof TripExpenseFilterState, string>>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value) params.set(key, String(value));
        else params.delete(key);
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Push the debounced search term into the URL.
  useEffect(() => {
    if (q === urlQ) return;
    const t = setTimeout(() => setParams({ q }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, urlQ, setParams]);

  const clear = useCallback(() => {
    setQ("");
    setParams({ category: "", payerId: "", q: "" });
  }, [setParams]);

  const applied = useMemo(
    () => ({
      category: category || undefined,
      payerId: payerId || undefined,
      q: urlQ || undefined,
    }),
    [category, payerId, urlQ]
  );

  return {
    category,
    payerId,
    q,
    setQ,
    setParams,
    clear,
    applied,
    hasActiveFilters: !!(category || payerId || urlQ),
  };
}
