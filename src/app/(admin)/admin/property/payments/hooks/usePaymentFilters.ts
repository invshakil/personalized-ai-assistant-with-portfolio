import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** Filter state lives in the URL (deep-linkable, restored on reload). */
export function usePaymentFilters() {
  const now = new Date();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // month="all" (or absent → defaults to current month). When "all", payments
  // are fetched across every month via the period range.
  const monthParam = searchParams.get("month");
  const month: number | "all" =
    monthParam === "all" ? "all" : monthParam ? Number(monthParam) : now.getMonth() + 1;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : now.getFullYear();
  const unitParam = searchParams.get("unit") ?? "";
  const unitFilter = useMemo(() => unitParam.split(",").filter(Boolean), [unitParam]);
  const tenantParam = searchParams.get("tenant") ?? "";
  const tenantFilter = useMemo(() => tenantParam.split(",").filter(Boolean), [tenantParam]);
  const isAllMonths = month === "all";

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

  // Build the API filter object from current URL state. "All months" fetches
  // every month via period=all; a specific month/year filters exactly. Unit and
  // tenant filters are applied server-side in the `where`.
  const buildFilters = useCallback(() => {
    const f: {
      month?: number;
      year?: number;
      unitIds?: string[];
      tenantIds?: string[];
      period?: string;
    } = {};
    if (isAllMonths) f.period = "all";
    else {
      f.month = month as number;
      f.year = year;
    }
    if (unitFilter.length) f.unitIds = unitFilter;
    if (tenantFilter.length) f.tenantIds = tenantFilter;
    return f;
  }, [isAllMonths, month, year, unitFilter, tenantFilter]);

  const hasActiveFilters = unitFilter.length > 0 || tenantFilter.length > 0 || isAllMonths;

  return {
    now,
    month,
    year,
    unitFilter,
    tenantFilter,
    isAllMonths,
    setParams,
    buildFilters,
    hasActiveFilters,
  };
}
