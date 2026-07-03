import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { MoneyCategoryRow } from "@/types";
import { MONEY_RANGE_PERIOD, type MoneyRange } from "../../format";
import { PERIOD_TO_RANGE, type DirFilter, type SortBy, type SortDir } from "../types";

/**
 * Filter + sort state lives entirely in the URL (deep-linkable, restored on reload).
 *
 * Does not take `categories` as a hook argument — `categories` is only available from
 * `useEntryData`, which itself needs this hook's `dirFilter`/`categoryFilter`/etc to fetch,
 * so category-aware helpers (`onTypeChange`) instead take categories at call time.
 */
export function useEntryFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const dirFilter = (searchParams.get("type") as DirFilter | null) ?? "ALL";
  const categoryParam = searchParams.get("category") ?? "";
  const categoryFilter = useMemo(() => categoryParam.split(",").filter(Boolean), [categoryParam]);
  const accountParam = searchParams.get("account") ?? "";
  const accountFilter = useMemo(() => accountParam.split(",").filter(Boolean), [accountParam]);
  const currencyParam = searchParams.get("currency") ?? "";
  const currencyFilter = useMemo(() => currencyParam.split(",").filter(Boolean), [currencyParam]);
  const q = searchParams.get("q") ?? "";
  const sortBy = (searchParams.get("sort") as SortBy | null) ?? "date";
  const sortDir = (searchParams.get("order") as SortDir | null) ?? "desc";

  const hasCustomRange = Boolean(from || to);
  const activePreset: MoneyRange | "CUSTOM" = hasCustomRange
    ? "CUSTOM"
    : (period && PERIOD_TO_RANGE[period]) || "M1";

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

  const hasActiveFilters =
    dirFilter !== "ALL" ||
    categoryFilter.length > 0 ||
    accountFilter.length > 0 ||
    currencyFilter.length > 0 ||
    Boolean(q);

  // Changing the type may invalidate the selected category — clear it if so.
  const onTypeChange = (next: DirFilter, categories: MoneyCategoryRow[]) => {
    const patch: Record<string, string | undefined> = { type: next === "ALL" ? undefined : next };
    if (categoryFilter.length > 0) {
      const validIds = categoryFilter.filter((id) => {
        const kind = categories.find((c) => c.id === id)?.kind;
        return (
          next === "ALL" ||
          next === "TRANSFER" ||
          kind === (next === "CREDIT" ? "INCOME" : "EXPENSE")
        );
      });
      if (validIds.length !== categoryFilter.length) {
        patch.category = validIds.length ? validIds.join(",") : undefined;
      }
    }
    setParams(patch);
  };

  const onPresetChange = (preset: MoneyRange) =>
    setParams({ period: MONEY_RANGE_PERIOD[preset], from: undefined, to: undefined });

  const toggleSort = (col: SortBy) => {
    if (sortBy === col) {
      setParams({ order: sortDir === "asc" ? "desc" : "asc" });
    } else {
      setParams({ sort: col, order: col === "category" ? "asc" : "desc" });
    }
  };

  const clearFilters = () =>
    setParams({
      type: undefined,
      category: undefined,
      account: undefined,
      currency: undefined,
      q: undefined,
    });

  return {
    period,
    from,
    to,
    dirFilter,
    categoryFilter,
    accountFilter,
    currencyFilter,
    q,
    sortBy,
    sortDir,
    hasCustomRange,
    activePreset,
    hasActiveFilters,
    searchInput,
    setSearchInput,
    setParams,
    onTypeChange,
    onPresetChange,
    toggleSort,
    clearFilters,
  };
}
