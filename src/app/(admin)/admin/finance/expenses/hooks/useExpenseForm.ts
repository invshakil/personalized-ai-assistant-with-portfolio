import { useState } from "react";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { financeApi } from "@/lib/api/finance";
import type { MoneyAccountRow } from "@/types";
import type { BizExpenseRow, CategoryRow } from "../../types";
import { todayInput } from "../../format";
import { BLANK_EXPENSE_FORM, NO_ACCOUNT, type ExpenseForm } from "../types";

export function useExpenseForm(
  categories: CategoryRow[],
  accounts: MoneyAccountRow[],
  onSuccess: () => Promise<void>
) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(BLANK_EXPENSE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultAccountId = () => accounts.find((a) => a.type === "BANK")?.id ?? NO_ACCOUNT;

  function openAdd() {
    setEditing(null);
    setForm({
      ...BLANK_EXPENSE_FORM,
      date: todayInput(),
      fiscalYear: fiscalYearOf(new Date()),
      categoryId: categories[0]?.id ?? "",
      accountId: defaultAccountId(),
    });
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(e: BizExpenseRow) {
    setEditing(e.id);
    setForm({
      date: e.date ? e.date.split("T")[0] : todayInput(),
      name: e.name,
      categoryId: e.categoryId,
      isRecurring: e.isRecurring,
      amount: String(e.amount),
      fiscalYear: e.fiscalYear,
      notes: e.notes ?? "",
      accountId: NO_ACCOUNT,
    });
    setError(null);
    setDrawerOpen(true);
  }

  function onDateChange(date: string) {
    setForm((f) => ({
      ...f,
      date,
      fiscalYear: date ? fiscalYearOf(new Date(date)) : f.fiscalYear,
    }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        date: form.date,
        name: form.name,
        categoryId: form.categoryId,
        isRecurring: form.isRecurring,
        amount: parseFloat(form.amount),
        fiscalYear: form.fiscalYear,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updateExpense(editing, body);
      // accountId is create-only (opt-in link; no back-sync on edit).
      else await financeApi.createExpense({ ...body, accountId: form.accountId || undefined });
      setDrawerOpen(false);
      await onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return {
    drawerOpen,
    editing,
    form,
    setForm,
    saving,
    error,
    openAdd,
    openEdit,
    onDateChange,
    save,
    closeDrawer: () => setDrawerOpen(false),
  };
}
