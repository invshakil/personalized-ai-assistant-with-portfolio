import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { Payee } from "@/types";

export function usePayeeEdit(id: string, payee: Payee | null, onSaved: () => Promise<void>) {
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Payee>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function openEdit() {
    if (!payee) return;
    setEditForm({
      name: payee.name,
      role: payee.role,
      phone: payee.phone ?? "",
      email: payee.email ?? "",
      address: payee.address ?? "",
      nidNumber: payee.nidNumber ?? "",
      notes: payee.notes ?? "",
    });
    setSaveError(null);
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!payee) return;
    setSaving(true);
    setSaveError(null);
    try {
      await propertyApi.updatePayee(id, editForm);
      setEditOpen(false);
      await onSaved();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return {
    editOpen,
    editForm,
    setEditForm,
    saving,
    saveError,
    openEdit,
    saveEdit,
    closeEdit: () => setEditOpen(false),
  };
}
