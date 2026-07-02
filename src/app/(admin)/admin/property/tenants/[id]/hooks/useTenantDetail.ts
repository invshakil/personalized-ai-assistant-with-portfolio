import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PaymentWithTenant, TenantWithUnit } from "@/types";

export function useTenantDetail(id: string) {
  const [tenant, setTenant] = useState<(TenantWithUnit & { payments: PaymentWithTenant[] }) | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTenant(
        (await propertyApi.getTenant<TenantWithUnit & { payments: PaymentWithTenant[] }>(id)) ??
          null
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return { tenant, loading, reload: load };
}
