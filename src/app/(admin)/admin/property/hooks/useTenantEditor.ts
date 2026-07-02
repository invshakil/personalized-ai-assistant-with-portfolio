import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";
import type { TenantForm } from "../types";

export function useTenantEditor(
  onDataRefresh: (fresh: UnitWithTenant[]) => void,
  onSaved: () => Promise<void>
) {
  const [editTenantRow, setEditTenantRow] = useState<UnitWithTenant | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantForm>({
    name: "",
    phone: "",
    moveInDate: "",
    leaseEndDate: "",
    advancePaid: false,
    advanceAmount: "0",
  });
  const [saving, setSaving] = useState(false);

  function openTenantEdit(row: UnitWithTenant) {
    const t = row.tenant!;
    setEditTenantRow(row);
    setTenantForm({
      name: t.name,
      phone: t.phone ?? "",
      moveInDate: t.moveInDate.split("T")[0],
      leaseEndDate: t.leaseEndDate ? t.leaseEndDate.split("T")[0] : "",
      advancePaid: t.advancePaid,
      advanceAmount: String(t.advanceAmount),
    });
  }

  function closeTenantEdit() {
    setEditTenantRow(null);
  }

  async function saveTenant() {
    if (!editTenantRow?.tenant) return;
    setSaving(true);
    try {
      await propertyApi.updateTenant(editTenantRow.tenant.id, {
        name: tenantForm.name,
        phone: tenantForm.phone || null,
        moveInDate: tenantForm.moveInDate,
        leaseEndDate: tenantForm.leaseEndDate || null,
        advancePaid: tenantForm.advancePaid,
        advanceAmount: Number(tenantForm.advanceAmount),
      });
      setEditTenantRow(null);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  /** Refetch units and re-point the open drawer at the freshened row (used after service/rent-change mutations). */
  async function refreshEditRow(tenantId: string) {
    const fresh: UnitWithTenant[] = (await propertyApi.listUnits()) ?? [];
    onDataRefresh(fresh);
    const freshRow = fresh.find((u) => u.tenant?.id === tenantId);
    if (freshRow) setEditTenantRow(freshRow);
  }

  return {
    editTenantRow,
    tenantForm,
    setTenantForm,
    saving,
    openTenantEdit,
    closeTenantEdit,
    saveTenant,
    refreshEditRow,
  };
}
