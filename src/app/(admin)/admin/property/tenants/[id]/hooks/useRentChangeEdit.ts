import { useState } from "react";
import { propertyApi } from "@/lib/api/property";

interface RentChange {
  id: string;
  effectiveDate: string;
  newRent: number;
  reason: string | null;
}

export function useRentChangeEdit(onSave: () => Promise<void>) {
  const [editRcId, setEditRcId] = useState<string | null>(null);
  const [editRcDate, setEditRcDate] = useState("");
  const [editRcRent, setEditRcRent] = useState("");
  const [editRcReason, setEditRcReason] = useState("");
  const [rcSaving, setRcSaving] = useState(false);

  function openEditRc(rc: RentChange) {
    setEditRcId(rc.id);
    setEditRcDate(rc.effectiveDate.split("T")[0]);
    setEditRcRent(String(rc.newRent));
    setEditRcReason(rc.reason ?? "");
  }

  function closeEditRc() {
    setEditRcId(null);
  }

  async function saveEditRc() {
    if (!editRcId) return;
    setRcSaving(true);
    try {
      await propertyApi.updateRentChange(editRcId, {
        effectiveDate: editRcDate,
        newRent: Number(editRcRent),
        reason: editRcReason || null,
      });
      setEditRcId(null);
      await onSave();
    } finally {
      setRcSaving(false);
    }
  }

  async function deleteRc(rcId: string) {
    if (!confirm("Delete this scheduled rent change?")) return;
    await propertyApi.deleteRentChange(rcId);
    await onSave();
  }

  return {
    editRcId,
    editRcDate,
    setEditRcDate,
    editRcRent,
    setEditRcRent,
    editRcReason,
    setEditRcReason,
    rcSaving,
    openEditRc,
    closeEditRc,
    saveEditRc,
    deleteRc,
  };
}
