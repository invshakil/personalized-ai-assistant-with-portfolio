import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FILTER_RANGE_TOKEN, TOKEN_TO_FILTER_RANGE, type FilterRangePreset } from "../../format";

/** Filter state lives entirely in the URL (deep-linkable, restored on reload). */
export function useEarningFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const fyParam = searchParams.get("fy") ?? "";
  const fyFilter = useMemo(() => fyParam.split(",").filter(Boolean), [fyParam]);
  const sourceParam = searchParams.get("source") ?? "";
  const sourceFilter = useMemo(() => sourceParam.split(",").filter(Boolean), [sourceParam]);
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const q = searchParams.get("q") ?? "";

  const hasCustomRange = Boolean(from || to);
  const activePreset: FilterRangePreset | "CUSTOM" = hasCustomRange
    ? "CUSTOM"
    : (period && TOKEN_TO_FILTER_RANGE[period]) || "M1";

  /** Merge a patch into the URL query (undefined/"" removes the key). */
  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // Debounced search box: local input mirrors ?q, pushed to the URL after a pause.
  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => {
    setSearchInput(q);
  }, [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) setParams({ q: searchInput || undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, q, setParams]);

  const onPresetChange = (preset: FilterRangePreset) =>
    setParams({
      period: FILTER_RANGE_TOKEN[preset],
      from: undefined,
      to: undefined,
    });

  const hasActiveFilters =
    fyFilter.length > 0 ||
    sourceFilter.length > 0 ||
    hasCustomRange ||
    Boolean(period) ||
    Boolean(q);

  return {
    fyFilter,
    sourceFilter,
    period,
    from,
    to,
    q,
    hasCustomRange,
    activePreset,
    setParams,
    searchInput,
    setSearchInput,
    onPresetChange,
    hasActiveFilters,
  };
}
