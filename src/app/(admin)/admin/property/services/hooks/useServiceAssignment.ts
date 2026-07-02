import { useState } from "react";
import { propertyApi } from "@/lib/api/property";

export function useServiceAssignment(onSuccess: () => Promise<void>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [fee, setFee] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDrawer() {
    setTenantId("");
    setServiceId("");
    setFee("");
    setDate(new Date().toISOString().split("T")[0]);
    setError(null);
    setDrawerOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await propertyApi.assignService({
        tenantId,
        serviceId,
        monthlyFee: parseFloat(fee),
        startDate: date,
      });
      setDrawerOpen(false);
      await onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function endAssignment(tenantServiceId: string) {
    if (!confirm("End this service subscription?")) return;
    await propertyApi.removeAssignedService(tenantServiceId);
    await onSuccess();
  }

  return {
    drawerOpen,
    tenantId,
    setTenantId,
    serviceId,
    setServiceId,
    fee,
    setFee,
    date,
    setDate,
    saving,
    error,
    openDrawer,
    closeDrawer: () => setDrawerOpen(false),
    save,
    endAssignment,
  };
}
