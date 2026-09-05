import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyCategoryRow, MoneyCategoryKind } from "@/types";

export type CategoryForm = { name: string; kind: MoneyCategoryKind };

const BLANK: CategoryForm = { name: "", kind: "EXPENSE" };

/** Owns the add/edit drawer's open state, form values, and save mutation. */
export function useCategoryForm(onSaved: () => void) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(BLANK);
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (c: MoneyCategoryRow) => {
    setEditing(c.id);
    setForm({ name: c.name, kind: c.kind });
    setError(null);
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editing) await moneyApi.updateCategory(editing, form);
      else await moneyApi.createCategory(form);
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
