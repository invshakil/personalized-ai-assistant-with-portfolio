import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";

type ActiveTenant = {
  id: string;
  tenantCode: string | null;
  name: string;
  phone: string | null;
  isExternal: boolean;
  moveInDate: string;
  moveOutDate: string | null;
  leaseEndDate: string | null;
  advancePaid: boolean;
  advanceAmount: number;
  advanceSettled: boolean;
  services?: { id: string; serviceName: string; monthlyFee: number }[];
};

export function useUnitsData() {
  const [units, setUnits] = useState<UnitWithTenant[]>([]);
  const [unassignedRows, setUnassignedRows] = useState<UnitWithTenant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-deactivate any tenants whose lease has expired (fire-and-forget; silent)
      propertyApi.autoDeactivateExpired().catch(() => {});

      const [unitData, activeTenants] = await Promise.all([
        propertyApi.listUnits(),
        propertyApi.listTenants("active"),
      ]);
      setUnits(unitData ?? []);

      // Active tenants with no unit (e.g. after re-activation before unit reassignment)
      // Include futureTenant IDs so scheduled tenants aren't also listed under "Unassigned"
      const unitTenantIds = new Set([
        ...(unitData ?? []).map((u) => u.tenant?.id).filter(Boolean),
        ...(unitData ?? []).map((u) => u.futureTenant?.id).filter(Boolean),
      ]);
      const unassigned: UnitWithTenant[] = ((activeTenants ?? []) as unknown as ActiveTenant[])
        .filter((t) => !unitTenantIds.has(t.id))
        .map((t) => ({
          id: `unassigned-${t.id}`,
          unitNumber: "Unassigned",
          floor: "—",
          monthlyRent: 0,
          description: null,
          isOccupied: false,
          notes: null,
          futureTenant: null,
          tenant: {
            id: t.id,
            tenantCode: t.tenantCode,
            name: t.name,
            phone: t.phone,
            isActive: true,
            isExternal: t.isExternal,
            tenantStatus: "CURRENT" as const,
            moveInDate: t.moveInDate,
            moveOutDate: t.moveOutDate ?? null,
            leaseEndDate: t.leaseEndDate,
            advancePaid: t.advancePaid,
            advanceAmount: t.advanceAmount,
            advanceSettled: t.advanceSettled,
            services: t.services ?? [],
          },
        }));
      setUnassignedRows(unassigned);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { units, setUnits, unassignedRows, loading, reload: load };
}
