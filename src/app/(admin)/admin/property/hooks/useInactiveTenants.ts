import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";

type InactiveTenant = {
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
  lastRent: number | null;
};

export function useInactiveTenants(tenantQuery: string, shouldLoad: boolean) {
  const [inactiveRows, setInactiveRows] = useState<UnitWithTenant[]>([]);
  const [inactiveLoading, setInactiveLoading] = useState(false);

  const loadInactive = useCallback(async () => {
    setInactiveLoading(true);
    try {
      // Past tenants have no unit/status; only the name/phone search applies.
      const inactiveTenants = await propertyApi.listTenants({
        filter: "inactive",
        ...(tenantQuery && { q: tenantQuery }),
      });
      setInactiveRows(
        ((inactiveTenants ?? []) as unknown as InactiveTenant[]).map((t) => ({
          id: t.id,
          unitNumber: "—",
          floor: "—",
          monthlyRent: t.lastRent ?? 0,
          description: null,
          isOccupied: false,
          notes: null,
          futureTenant: null,
          tenant: {
            id: t.id,
            tenantCode: t.tenantCode,
            name: t.name,
            phone: t.phone,
            isActive: false,
            isExternal: t.isExternal,
            tenantStatus: "PAST" as const,
            moveInDate: t.moveInDate,
            moveOutDate: t.moveOutDate ?? null,
            leaseEndDate: t.leaseEndDate,
            advancePaid: t.advancePaid,
            advanceAmount: t.advanceAmount,
            advanceSettled: t.advanceSettled,
          },
        }))
      );
    } finally {
      setInactiveLoading(false);
    }
  }, [tenantQuery]);

  // Reload the Past list when its search query changes while it is visible.
  useEffect(() => {
    if (shouldLoad) loadInactive();
  }, [shouldLoad, loadInactive]);

  return { inactiveRows, inactiveLoading, loadInactive };
}
