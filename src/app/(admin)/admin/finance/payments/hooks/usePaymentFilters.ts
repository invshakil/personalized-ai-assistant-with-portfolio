import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import type { PaymentFilters as PaymentApiFilters } from "@/lib/api/finance";
import type { PaymentKind } from "../../types";
import { FILTER_RANGE_TOKEN, TOKEN_TO_FILTER_RANGE, type FilterRangePreset } from "../../format";

/** Filter state lives entirely in the URL (deep-linkable, restored on reload). */
export function usePaymentFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const fyParam = searchParams.get("fy") ?? "";
  const fyFilter = useMemo(() => fyParam.split(",").filter(Boolean), [fyParam]);
  const empParam = searchParams.get("employee") ?? "";
  const empFilter = useMemo(() => empParam.split(",").filter(Boolean), [empParam]);
  const typeParam = searchParams.get("type") ?? "";
  const typeFilter = useMemo(
    () => typeParam.split(",").filter(Boolean) as PaymentKind[],
    [typeParam]
  );
  const clientParam = searchParams.get("client") ?? "";
  const clientFilter = useMemo(() => clientParam.split(",").filter(Boolean), [clientParam]);
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

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
    empFilter.length > 0 ||
    typeFilter.length > 0 ||
    clientFilter.length > 0 ||
    hasCustomRange ||
    Boolean(period);

  const onPresetChange = (preset: FilterRangePreset) =>
    setParams({
      period: FILTER_RANGE_TOKEN[preset],
      from: undefined,
      to: undefined,
    });

  const buildApiFilters = useCallback((): PaymentApiFilters => {
    return {
      fiscalYears: fyFilter,
      employeeIds: empFilter,
      types: typeFilter,
      clientIds: clientFilter,
      ...(hasCustomRange ? { from, to } : { period: period ?? "this_month" }),
    };
  }, [fyFilter, empFilter, typeFilter, clientFilter, hasCustomRange, from, to, period]);

  return {
    fyFilter,
    empFilter,
    typeFilter,
    clientFilter,
    period,
    from,
    to,
    hasCustomRange,
    activePreset,
    hasActiveFilters,
    setParams,
    onPresetChange,
    buildApiFilters,
  };
}
