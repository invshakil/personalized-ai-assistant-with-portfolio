import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { BeneficiaryRow } from "@/types";

type PersonForm = { name: string; relationship: string; phone: string; notes: string };
const BLANK_PERSON: PersonForm = { name: "", relationship: "", phone: "", notes: "" };

/** Owns the add/edit person drawer: open/close, form state, and save. */
export function usePersonDrawer(onSaved: () => void) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PersonForm>(BLANK_PERSON);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(BLANK_PERSON);
    setError(null);
    setOpen(true);
  }

  function openEdit(b: BeneficiaryRow) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      relationship: b.relationship ?? "",
      phone: b.phone ?? "",
      notes: b.notes ?? "",
    });
    setError(null);
    setOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        relationship: form.relationship || null,
        phone: form.phone || null,
        notes: form.notes || null,
      };
      if (editingId) await moneyApi.updateBeneficiary(editingId, body);
      else await moneyApi.createBeneficiary(body);
      setOpen(false);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return {
    open,
    editingId,
    form,
    setForm,
    saving,
    error,
    openAdd,
    openEdit,
    save,
    close: () => setOpen(false),
  };
}
