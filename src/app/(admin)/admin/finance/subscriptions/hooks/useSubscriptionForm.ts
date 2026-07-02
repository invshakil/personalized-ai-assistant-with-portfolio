import { useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { SubscriptionRow, CategoryRow } from "../../types";
import { thisMonthInput } from "../../format";
import { BLANK, monthInput, type SubForm } from "../types";

export function useSubscriptionForm(categories: CategoryRow[], onSuccess: () => Promise<void>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<SubForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...BLANK, startMonth: thisMonthInput(), categoryId: categories[0]?.id ?? "" });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (s: SubscriptionRow) => {
    setEditing(s.id);
    setForm({
      name: s.name,
      categoryId: s.categoryId,
      monthlyAmount: String(s.monthlyAmount),
      startMonth: monthInput(s.startDate),
      notes: s.notes ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        categoryId: form.categoryId,
        monthlyAmount: parseFloat(form.monthlyAmount),
        startDate: `${form.startMonth}-01`,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updateSubscription(editing, body);
      else await financeApi.createSubscription(body);
      setDrawerOpen(false);
      await onSuccess();
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
    save,
    closeDrawer: () => setDrawerOpen(false),
  };
}
