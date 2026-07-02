import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";
import type { RentChangeForm } from "../types";

export function useRentChangeForm() {
  const [showRcForm, setShowRcForm] = useState(false);
  const [rcForm, setRcForm] = useState<RentChangeForm>({
    effectiveDate: "",
    newRent: "",
    reason: "",
  });
  const [saving, setSaving] = useState(false);

  /** Reset the form for a newly opened tenant edit drawer (called alongside openTenantEdit). */
  function resetFor(monthlyRent: number) {
    setShowRcForm(false);
    setRcForm({ effectiveDate: "", newRent: String(monthlyRent), reason: "" });
  }

  async function saveRentChange(editTenantRow: UnitWithTenant | null) {
    if (!editTenantRow?.tenant || !rcForm.effectiveDate || !rcForm.newRent) return;
    setSaving(true);
    try {
      await propertyApi.addRentChange(editTenantRow.tenant.id, {
        effectiveDate: rcForm.effectiveDate,
        newRent: Number(rcForm.newRent),
        reason: rcForm.reason || null,
      });
      setShowRcForm(false);
      setRcForm({ effectiveDate: "", newRent: String(editTenantRow.monthlyRent), reason: "" });
    } finally {
      setSaving(false);
    }
  }

  return { showRcForm, setShowRcForm, rcForm, setRcForm, saving, resetFor, saveRentChange };
}
