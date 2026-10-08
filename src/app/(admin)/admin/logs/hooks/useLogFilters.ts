import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { LogSortBy, SortDir } from "../types";

/** Filter/sort/page state lives in the URL (deep-linkable, restored on reload). */
export function useLogFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const level = searchParams.get("level") ?? "";
  const source = searchParams.get("source") ?? "";
  const period = searchParams.get("period") ?? "";
  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const q = searchParams.get("q") ?? "";
  const sortBy = (searchParams.get("sort") as LogSortBy | null) ?? "createdAt";
  const sortDir = (searchParams.get("order") as SortDir | null) ?? "desc";
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const setParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "") next.delete(k);
        else next.set(k, v);
      }
      // Any filter change goes back to page 1; only an explicit page patch keeps it.
      if (!("page" in patch)) next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) setParams({ q: searchInput || undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput, q, setParams]);

  const toggleSort = (col: LogSortBy) => {
    if (sortBy === col) setParams({ order: sortDir === "asc" ? "desc" : "asc" });
    else setParams({ sort: col, order: col === "createdAt" ? "desc" : "asc" });
  };

  const clearFilters = () =>
    setParams({
      level: undefined,
      source: undefined,
      period: undefined,
      from: undefined,
      to: undefined,
      q: undefined,
    });

  const hasActiveFilters = Boolean(level || source || period || from || to || q);

  return {
    level,
    source,
    period,
    from,
    to,
    q,
    sortBy,
    sortDir,
    page,
    searchInput,
    setSearchInput,
    setParams,
    toggleSort,
    clearFilters,
    hasActiveFilters,
  };
}
