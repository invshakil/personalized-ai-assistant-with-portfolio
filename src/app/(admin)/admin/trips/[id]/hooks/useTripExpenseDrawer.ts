import { useCallback, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow, MoneyEntryRow, TripCategory } from "@/types";
import { todayInput } from "../../format";

export interface TripExpenseForm {
  date: string;
  category: TripCategory;
  accountId: string;
  amount: string;
  description: string;
  notes: string;
  fxRate: string;
}

const BLANK: TripExpenseForm = {
  date: todayInput(),
  category: "FOOD",
  accountId: "",
  amount: "",
  description: "",
  notes: "",
  fxRate: "",
};

/** Add/edit/delete a trip expense (a DEBIT MoneyEntry on a real account). */
export function useTripExpenseDrawer(
  tripId: string,
  accounts: MoneyAccountRow[],
  reload: () => Promise<void>
) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TripExpenseForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const currencyOf = useCallback(
    (id: string) => accounts.find((a) => a.id === id)?.currency ?? "BDT",
    [accounts]
  );

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm(BLANK);
    setError(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((r: MoneyEntryRow) => {
    setEditing(r.id);
    setForm({
      date: r.date.slice(0, 10),
      category: (r.tripCategory ?? "MISC") as TripCategory,
      accountId: r.accountId ?? "",
      amount: String(r.amount),
      description: r.description ?? "",
      notes: r.notes ?? "",
      fxRate: r.fxRate != null ? String(r.fxRate) : "",
    });
    setError(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  /** Pick the paying account; auto-prefill the live rate for a foreign account. */
  const setAccount = useCallback(
    async (id: string) => {
      setForm((f) => ({ ...f, accountId: id }));
      const cur = accounts.find((a) => a.id === id)?.currency ?? "BDT";
      if (cur === "BDT") {
        setForm((f) => ({ ...f, fxRate: "" }));
        return;
      }
      setRateLoading(true);
      try {
        const r = await moneyApi.getFxRate(cur);
        if (r?.rate) setForm((f) => ({ ...f, fxRate: String(r.rate) }));
      } finally {
        setRateLoading(false);
      }
    },
    [accounts]
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const amount = Number(form.amount);
      const cur = accounts.find((a) => a.id === form.accountId)?.currency ?? "BDT";
      const fxRate = cur !== "BDT" && form.fxRate ? Number(form.fxRate) : undefined;
      if (editing) {
        await tripsApi.updateExpense(tripId, editing, {
          category: form.category,
          amount,
          date: form.date,
          description: form.description || null,
          notes: form.notes || null,
        });
      } else {
        await tripsApi.createExpense(tripId, {
          category: form.category,
          accountId: form.accountId,
          amount,
          date: form.date,
          description: form.description || null,
          notes: form.notes || null,
          ...(fxRate && { fxRate }),
        });
      }
      setOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  }, [editing, form, tripId, accounts, reload]);

  const remove = useCallback(
    async (r: MoneyEntryRow) => {
      await tripsApi.deleteExpense(tripId, r.id);
      await reload();
    },
    [tripId, reload]
  );

  return {
    open,
    editing,
    form,
    setForm,
    saving,
    error,
    rateLoading,
    currencyOf,
    openAdd,
    openEdit,
    close,
    setAccount,
    save,
    remove,
  };
}
