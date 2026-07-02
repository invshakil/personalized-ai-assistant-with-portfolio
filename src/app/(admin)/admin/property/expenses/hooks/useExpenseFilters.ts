import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** Filter state lives in the URL (deep-linkable, restored on reload). */
export function useExpenseFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const now = new Date();

  const month = searchParams.get("month") ? Number(searchParams.get("month")) : now.getMonth() + 1;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : now.getFullYear();
  const payeeParam = searchParams.get("payee") ?? "";
  const payeeFilter = useMemo(() => payeeParam.split(",").filter(Boolean), [payeeParam]);
  const categoryParam = searchParams.get("category") ?? "";
  const categoryFilter = useMemo(() => categoryParam.split(",").filter(Boolean), [categoryParam]);
  const serviceTypeParam = searchParams.get("serviceType") ?? "";
  const serviceTypeFilter = useMemo(
    () => serviceTypeParam.split(",").filter(Boolean),
    [serviceTypeParam]
  );
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

  const hasActiveFilters =
    payeeFilter.length > 0 ||
    categoryFilter.length > 0 ||
    serviceTypeFilter.length > 0 ||
    Boolean(q);

  const clearFilters = () =>
    setParams({ payee: undefined, category: undefined, serviceType: undefined, q: undefined });

  return {
    now,
    month,
    year,
    payeeFilter,
    categoryFilter,
    serviceTypeFilter,
    q,
    setParams,
    hasActiveFilters,
    clearFilters,
  };
}
