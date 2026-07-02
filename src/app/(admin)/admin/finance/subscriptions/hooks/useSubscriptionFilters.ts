import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

/** Filter state lives entirely in the URL (deep-linkable, restored on reload). */
export function useSubscriptionFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const categoryParam = searchParams.get("category") ?? "";
  const categoryFilter = useMemo(() => categoryParam.split(",").filter(Boolean), [categoryParam]);
  const q = searchParams.get("q") ?? "";

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

  const hasActiveFilters = categoryFilter.length > 0 || Boolean(q);

  return {
    categoryFilter,
    q,
    searchInput,
    setSearchInput,
    setParams,
    hasActiveFilters,
  };
}
