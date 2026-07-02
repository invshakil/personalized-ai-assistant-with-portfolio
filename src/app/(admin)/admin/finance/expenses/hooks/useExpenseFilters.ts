import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FILTER_RANGE_TOKEN, TOKEN_TO_FILTER_RANGE, type FilterRangePreset } from "../../format";

/** Filter state lives entirely in the URL (deep-linkable, restored on reload). */
export function useExpenseFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const fyParam = searchParams.get("fy") ?? "";
  const fyFilter = useMemo(() => fyParam.split(",").filter(Boolean), [fyParam]);
  const categoryParam = searchParams.get("category") ?? "";
  const categoryFilter = useMemo(() => categoryParam.split(",").filter(Boolean), [categoryParam]);
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

  const hasActiveFilters =
    fyFilter.length > 0 ||
    categoryFilter.length > 0 ||
    hasCustomRange ||
    Boolean(period) ||
    Boolean(q);

  const clearFilters = () =>
    setParams({
      fy: undefined,
      category: undefined,
      period: undefined,
      from: undefined,
      to: undefined,
      q: undefined,
    });

  const onPresetChange = (preset: FilterRangePreset) =>
    setParams({ period: FILTER_RANGE_TOKEN[preset], from: undefined, to: undefined });

  return {
    fyFilter,
    categoryFilter,
    period,
    from,
    to,
    q,
    hasCustomRange,
    activePreset,
    setParams,
    hasActiveFilters,
    clearFilters,
    onPresetChange,
  };
}
