import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { TAB_KEYS, type TabKey } from "../types";

/** Tab + sub-view + tenant filters live in the URL (restored on reload). */
export function usePropertyTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const tabKey = (searchParams.get("tab") as TabKey | null) ?? "units";
  const tab = Math.max(0, TAB_KEYS.indexOf(tabKey));
  const tenantView: "active" | "past" = searchParams.get("tstatus") === "past" ? "past" : "active";
  const extView: "active" | "past" = searchParams.get("tstatus") === "past" ? "past" : "active";

  // Tenants-tab filters
  const tenantUnitParam = searchParams.get("tunit") ?? "";
  const tenantUnitFilter = useMemo(
    () => tenantUnitParam.split(",").filter(Boolean),
    [tenantUnitParam]
  );
  const tenantStateFilter = searchParams.get("tstate") ?? "ALL"; // ALL | CURRENT | FUTURE
  const tenantQuery = searchParams.get("tq") ?? "";

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

  const setTab = (i: number) =>
    setParams({ tab: TAB_KEYS[i] === "units" ? undefined : TAB_KEYS[i] });
  const setTenantView = (v: "active" | "past") =>
    setParams({ tstatus: v === "active" ? undefined : "past" });
  const setExtView = setTenantView;

  const hasTenantFilters =
    tenantUnitFilter.length > 0 || tenantStateFilter !== "ALL" || Boolean(tenantQuery);

  return {
    tab,
    tenantView,
    extView,
    tenantUnitFilter,
    tenantStateFilter,
    tenantQuery,
    setParams,
    setTab,
    setTenantView,
    setExtView,
    hasTenantFilters,
  };
}
