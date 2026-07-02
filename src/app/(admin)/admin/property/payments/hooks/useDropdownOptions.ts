import { useMemo } from "react";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { PaymentWithTenant, UnitWithTenant } from "@/types";
import { MONTHS } from "../types";

export function useDropdownOptions(units: UnitWithTenant[], payments: PaymentWithTenant[]) {
  const unitOptions: SelectOption[] = useMemo(
    () => units.map((u) => ({ value: u.id, label: u.unitNumber })),
    [units]
  );

  // Tenant options come from units (current + future) so a tenant is selectable
  // even before their payment rows load; deduped by id.
  const tenantOptions: SelectOption[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) {
      if (u.tenant) map.set(u.tenant.id, u.tenant.name);
      if (u.futureTenant) map.set(u.futureTenant.id, u.futureTenant.name);
    }
    for (const p of payments) map.set(p.tenantId, p.tenantName);
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, name]) => ({ value: id, label: name }));
  }, [units, payments]);

  const monthOptions: SelectOption[] = [
    { value: "all", label: "All months" },
    ...MONTHS.map((m, i) => ({ value: String(i + 1), label: m })),
  ];
  const yearOptions: SelectOption[] = [2025, 2026, 2027, 2028].map((y) => ({
    value: String(y),
    label: String(y),
  }));

  return { unitOptions, tenantOptions, monthOptions, yearOptions };
}
