import { useState, useEffect } from "react";
import { propertyApi } from "@/lib/api/property";

/** Active add-on services, for the tenant edit drawer's "assign service" picker. */
export function useServiceCatalog() {
  const [serviceCatalog, setServiceCatalog] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    propertyApi
      .listServices()
      .then((services) =>
        setServiceCatalog(
          ((services ?? []) as { id: string; name: string; isActive: boolean }[])
            .filter((s) => s.isActive)
            .map((s) => ({ id: s.id, name: s.name }))
        )
      );
  }, []);

  return serviceCatalog;
}
