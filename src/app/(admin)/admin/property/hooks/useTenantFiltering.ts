import { useCallback, useMemo } from "react";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { UnitWithTenant } from "@/types";

/**
 * The active Tenants view is an in-memory join of units (current + future
 * tenants) and unassigned tenants, so the unit/status/search filters are
 * applied as a predicate over the assembled rows. The Past view fetches with
 * the same filters server-side (see useInactiveTenants). The unit/status
 * filters are only meaningful for tenants; external members have no unit/status.
 */
export function useTenantFiltering(
  units: UnitWithTenant[],
  unassignedRows: UnitWithTenant[],
  tenantUnitFilter: string[],
  tenantStateFilter: string,
  tenantQuery: string
) {
  const unitsWithoutFuture = units.filter((u) => !u.futureTenant);

  const activeTenants = [
    ...units.filter((u) => u.tenant && !u.tenant.isExternal).map((u) => u.tenant!),
    ...unassignedRows.filter((r) => !r.tenant?.isExternal).map((r) => r.tenant!),
  ];
  const externalTenants = [
    ...units.filter((u) => u.tenant?.isExternal).map((u) => u.tenant!),
    ...unassignedRows.filter((r) => r.tenant?.isExternal).map((r) => r.tenant!),
  ];

  const tenantUnitOptions: SelectOption[] = useMemo(
    () => [
      { value: "UNASSIGNED", label: "Unassigned" },
      ...units.map((u) => ({ value: u.id, label: u.unitNumber })),
    ],
    [units]
  );
  const tenantStateOptions: SelectOption[] = [
    { value: "ALL", label: "All statuses" },
    { value: "CURRENT", label: "Active" },
    { value: "FUTURE", label: "Scheduled" },
  ];

  // Map a tenant id → the unit id it is shown under (current or future), so the
  // unit filter can match assembled rows. Unassigned rows have no unit.
  const tenantUnitId = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.tenant) map.set(u.tenant.id, u.id);
      if (u.futureTenant) map.set(u.futureTenant.id, u.id);
    }
    return map;
  }, [units]);

  const tenantMatches = useCallback(
    (row: UnitWithTenant) => {
      const t = row.tenant;
      if (!t) return false;
      if (tenantUnitFilter.length > 0) {
        const uid = tenantUnitId.get(t.id) ?? null;
        // Check if any of the selected values match: "UNASSIGNED" matches no-unit rows,
        // other values are unit ids.
        const hasUnassigned = tenantUnitFilter.includes("UNASSIGNED");
        const unitIds = tenantUnitFilter.filter((v) => v !== "UNASSIGNED");
        const matchesUnassigned = hasUnassigned && !uid;
        const matchesUnit = unitIds.length > 0 && uid !== null && unitIds.includes(uid);
        if (!matchesUnassigned && !matchesUnit) return false;
      }
      if (tenantStateFilter !== "ALL" && t.tenantStatus !== tenantStateFilter) return false;
      if (tenantQuery) {
        const q = tenantQuery.toLowerCase();
        const hit = t.name.toLowerCase().includes(q) || (t.phone ?? "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    },
    [tenantUnitFilter, tenantStateFilter, tenantQuery, tenantUnitId]
  );

  return {
    unitsWithoutFuture,
    activeTenants,
    externalTenants,
    tenantUnitOptions,
    tenantStateOptions,
    tenantMatches,
  };
}
