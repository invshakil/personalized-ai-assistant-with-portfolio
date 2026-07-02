import { useState, useEffect } from "react";

/** Debounced tenant search box: local input mirrors ?tq, pushed to the URL after a pause. */
export function useTenantSearch(
  tenantQuery: string,
  setParams: (patch: Record<string, string | undefined>) => void
) {
  const [tenantSearchInput, setTenantSearchInput] = useState(tenantQuery);

  useEffect(() => {
    setTenantSearchInput(tenantQuery);
  }, [tenantQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (tenantSearchInput !== tenantQuery) setParams({ tq: tenantSearchInput || undefined });
    }, 350);
    return () => clearTimeout(t);
  }, [tenantSearchInput, tenantQuery, setParams]);

  return { tenantSearchInput, setTenantSearchInput };
}
