import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PropertyExpense, MoneyAccountRow } from "@/types";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import {
  EMPTY_SELECTION,
  pairValidValues,
  rememberAccountPair,
  seedAccountPair,
  typeOfAccount,
  withKindFallback,
  type AccountSelection,
} from "@/lib/accountPicker";
import { BLANK_EXPENSE_FORM, type ExpenseForm } from "../types";

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

  // The Money account it was paid from — its type is the payment mode. Posting
  // to the ledger is create-only (no back-sync), so on Edit it is shown, not changed.
  const [expenseAccount, setExpenseAccount] = useState<AccountSelection>(EMPTY_SELECTION);
  const defaults = useFormDefaults("property.expense");

  function openAdd() {
    setEditing(null);
    setForm({ ...BLANK_EXPENSE_FORM, expenseDate: new Date().toISOString().split("T")[0] });
    // A stored default wins; with none, the first Cash account (as before).
    const seeded = seedAccountPair(accounts, defaults.seed(pairValidValues(accounts)));
    setExpenseAccount(withKindFallback(accounts, seeded, "CASH"));
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(e: PropertyExpense) {
    setEditing(e.id);
    setExpenseAccount({
      typeId: typeOfAccount(accounts, e.accountId),
      accountId: e.accountId ?? "",
    });
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      expenseDate: e.expenseDate ? e.expenseDate.split("T")[0] : "",
      paidTo: e.paidTo ?? "",
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
        // No paymentMode: the account's type is the mode now. Leaving it out
        // keeps an older expense's recorded mode intact on edit.
        payeeId: form.payeeId || null,
        serviceTypeId: form.serviceTypeId || null,
        notes: form.notes || null,
      };
      if (editing) await propertyApi.updateExpense(editing, body);
      // Linking is create-only: pass the chosen wallet to debit (if any).
      else {
        await propertyApi.createExpense({
          ...body,
          ...(expenseAccount.accountId ? { accountId: expenseAccount.accountId } : {}),
        });
        defaults.remember(rememberAccountPair(expenseAccount));
      }
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
    expenseAccount,
    setExpenseAccount,
    openAdd,
    openEdit,
    save,
    deleteExpense,
    closeDrawer: () => setDrawerOpen(false),
  };
}
