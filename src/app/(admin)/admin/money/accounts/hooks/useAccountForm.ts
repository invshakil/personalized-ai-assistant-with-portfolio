import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow, MoneyAccountType } from "@/types";

export type AccountForm = {
  name: string;
  type: MoneyAccountType;
  currency: string;
  openingBalance: string;
  creditLimit: string;
  isActive: boolean;
  notes: string;
};

const BLANK: AccountForm = {
  name: "",
  type: "BANK",
  currency: "BDT",
  openingBalance: "0",
  creditLimit: "",
  isActive: true,
  notes: "",
};

/** Owns the add/edit drawer's open state, form values, and save mutation. */
export function useAccountForm(onSaved: () => void) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  // Currency is locked once an account has entries (changing it would mix units).
  const [editingHasEntries, setEditingHasEntries] = useState(false);
  const [form, setForm] = useState<AccountForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setEditingHasEntries(false);
    setForm(BLANK);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (a: MoneyAccountRow) => {
    setEditing(a.id);
    setEditingHasEntries(a.entryCount > 0);
    setForm({
      name: a.name,
      type: a.type,
      currency: a.currency,
      openingBalance: String(a.openingBalance),
      creditLimit: a.creditLimit != null ? String(a.creditLimit) : "",
      isActive: a.isActive,
      notes: a.notes ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        type: form.type,
        currency: form.currency,
        openingBalance: parseFloat(form.openingBalance) || 0,
        creditLimit:
          form.type === "CREDIT_CARD" && form.creditLimit !== ""
            ? parseFloat(form.creditLimit)
            : null,
        isActive: form.isActive,
        notes: form.notes || null,
      };
      if (editing) await moneyApi.updateAccount(editing, body);
      else await moneyApi.createAccount(body);
      setDrawerOpen(false);
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return {
    drawerOpen,
    editing,
    editingHasEntries,
    form,
    setForm,
    saving,
    error,
    openAdd,
    openEdit,
    closeDrawer,
    save,
  };
}
