import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";

export function useTenantServices(
  editTenantRow: UnitWithTenant | null,
  refreshEditRow: (tenantId: string) => Promise<void>,
  openConfirm: (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
  ) => void
) {
  const [addSvcId, setAddSvcId] = useState("");
  const [addSvcFee, setAddSvcFee] = useState("");
  const [addSvcDate, setAddSvcDate] = useState("");
  const [saving, setSaving] = useState(false);

  /** Reset the form for a newly opened tenant edit drawer (called alongside openTenantEdit). */
  function resetForm() {
    setAddSvcId("");
    setAddSvcFee("");
    setAddSvcDate(new Date().toISOString().split("T")[0]);
  }

  async function assignService() {
    if (!editTenantRow?.tenant || !addSvcId || addSvcFee === "") return;
    setSaving(true);
    try {
      await propertyApi.assignService({
        tenantId: editTenantRow.tenant.id,
        serviceId: addSvcId,
        monthlyFee: parseFloat(addSvcFee),
        startDate: addSvcDate || new Date().toISOString().split("T")[0],
      });
      setAddSvcId("");
      setAddSvcFee("");
      setAddSvcDate(new Date().toISOString().split("T")[0]);
      await refreshEditRow(editTenantRow.tenant.id);
    } finally {
      setSaving(false);
    }
  }

  function removeService(tenantServiceId: string, tenantId: string) {
    openConfirm(
      "End Service",
      "End this service subscription for the tenant?",
      async () => {
        await propertyApi.removeAssignedService(tenantServiceId);
        await refreshEditRow(tenantId);
      },
      { confirmLabel: "End Subscription", confirmColor: "error" }
    );
  }

  return {
    addSvcId,
    setAddSvcId,
    addSvcFee,
    setAddSvcFee,
    addSvcDate,
    setAddSvcDate,
    saving,
    resetForm,
    assignService,
    removeService,
  };
}
