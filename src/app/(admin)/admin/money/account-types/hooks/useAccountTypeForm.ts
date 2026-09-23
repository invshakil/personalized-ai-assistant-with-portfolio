import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { AccountTypeRow, MoneyAccountType } from "@/types";

export type AccountTypeForm = { name: string; kind: MoneyAccountType };

const BLANK: AccountTypeForm = { name: "", kind: "BANK" };

/** Owns the add/rename drawer. The kind is fixed once a type exists. */
export function useAccountTypeForm(onSaved: () => void) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<AccountTypeForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(BLANK);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (t: AccountTypeRow) => {
    setEditing(t.id);
    setForm({ name: t.name, kind: t.kind });
    setError(null);
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) await moneyApi.updateAccountType(editing, { name: form.name });
      else await moneyApi.createAccountType(form);
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
    form,
    setForm,
    saving,
    error,
    openAdd,
    openEdit,
    closeDrawer: () => setDrawerOpen(false),
    save,
  };
}
