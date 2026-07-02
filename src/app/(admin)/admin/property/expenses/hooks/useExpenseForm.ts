import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PropertyExpense, MoneyAccountRow } from "@/types";
import { BLANK_EXPENSE_FORM, NO_ACCOUNT, type ExpenseForm } from "../types";

export function useExpenseForm(
  month: number,
  year: number,
  accounts: MoneyAccountRow[],
  onSuccess: () => Promise<void>
) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ExpenseForm>(BLANK_EXPENSE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Optional Money-Manager wallet to debit when adding an expense. Linking is
  // create-only (no back-sync), so this is only used on Add, never on Edit.
  const [expenseAccountId, setExpenseAccountId] = useState<string>(NO_ACCOUNT);

  function openAdd() {
    setEditing(null);
    setForm({ ...BLANK_EXPENSE_FORM, expenseDate: new Date().toISOString().split("T")[0] });
    // Default to the first CASH account (mode defaults to Cash); user can clear.
    setExpenseAccountId(accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT);
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(e: PropertyExpense) {
    setEditing(e.id);
    setExpenseAccountId(NO_ACCOUNT);
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      expenseDate: e.expenseDate ? e.expenseDate.split("T")[0] : "",
      paidTo: e.paidTo ?? "",
      paymentMode: e.paymentMode ?? "Cash",
      payeeId: e.payeeId ?? "",
      serviceTypeId: e.serviceTypeId ?? "",
      notes: e.notes ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = {
        description: form.description,
        amount: parseFloat(form.amount),
        category: form.category,
        month,
        year,
        expenseDate: form.expenseDate || null,
        paidTo: form.paidTo || null,
        paymentMode: form.paymentMode || null,
        payeeId: form.payeeId || null,
        serviceTypeId: form.serviceTypeId || null,
        notes: form.notes || null,
      };
      if (editing) await propertyApi.updateExpense(editing, body);
      // Linking is create-only: pass the chosen wallet to debit (if any).
      else
        await propertyApi.createExpense({
          ...body,
          ...(expenseAccountId ? { accountId: expenseAccountId } : {}),
        });
      setDrawerOpen(false);
      await onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    await propertyApi.deleteExpense(id);
    await onSuccess();
  }

  return {
    drawerOpen,
    editing,
    form,
    setForm,
    saving,
    error,
    expenseAccountId,
    setExpenseAccountId,
    openAdd,
    openEdit,
    save,
    deleteExpense,
    closeDrawer: () => setDrawerOpen(false),
  };
}
