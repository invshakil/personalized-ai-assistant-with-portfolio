import { useCallback, useMemo, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow, TripExpenseRow, TripParticipantRow, TripSplitMode } from "@/types";
import {
  blankExpenseForm,
  formToExpensePayload,
  rowToExpenseForm,
  type TripExpenseForm,
} from "./expenseForm";

export type { TripExpenseForm } from "./expenseForm";

/** Add / edit / delete a trip expense. A MoneyEntry is posted only for a self payer
 *  on a real, non-card account (the service decides); friend- and card-paid stay
 *  in the trip ledger. Fully-replaces on edit (recomputes shares server-side). */
export function useTripExpenseDrawer(
  tripId: string,
  accounts: MoneyAccountRow[],
  participants: TripParticipantRow[],
  reload: () => Promise<void>
) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const active = useMemo(() => participants.filter((p) => p.isActive), [participants]);
  const selfId = useMemo(() => participants.find((p) => p.isSelf)?.id ?? "", [participants]);
  const isSelf = useCallback(
    (pid: string) => participants.find((p) => p.id === pid)?.isSelf ?? false,
    [participants]
  );
  const accountCurrency = useCallback(
    (id: string) => accounts.find((a) => a.id === id)?.currency ?? "BDT",
    [accounts]
  );

  const blank = useCallback(
    () =>
      blankExpenseForm(
        selfId,
        active.map((p) => p.id)
      ),
    [selfId, active]
  );

  const [form, setForm] = useState<TripExpenseForm>(blank);

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm(blank());
    setError(null);
    setOpen(true);
  }, [blank]);

  const openEdit = useCallback((r: TripExpenseRow) => {
    setEditing(r.id);
    setForm(rowToExpenseForm(r));
    setError(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const prefillRate = useCallback(async (cur: string) => {
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
  }, []);

  /** Change payer; a non-self payer can't post, so drop the funding account. */
  const setPayer = useCallback((pid: string) => {
    setForm((f) => ({ ...f, payerId: pid }));
  }, []);

  /** Self path: pick the funding account and inherit its currency + live rate. */
  const setAccount = useCallback(
    async (id: string) => {
      const cur = accountCurrency(id);
      setForm((f) => ({ ...f, accountId: id, currency: cur }));
      await prefillRate(cur);
    },
    [accountCurrency, prefillRate]
  );

  /** Friend path: choose the currency the expense was paid in. */
  const setCurrency = useCallback(
    async (cur: string) => {
      setForm((f) => ({ ...f, currency: cur }));
      await prefillRate(cur);
    },
    [prefillRate]
  );

  const toggleParticipant = useCallback((id: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      participantIds: checked
        ? [...f.participantIds, id]
        : f.participantIds.filter((x) => x !== id),
    }));
  }, []);

  const selectAll = useCallback(() => {
    setForm((f) => ({ ...f, participantIds: active.map((p) => p.id) }));
  }, [active]);

  const selectOnlyPayer = useCallback(() => {
    setForm((f) => ({ ...f, participantIds: f.payerId ? [f.payerId] : [] }));
  }, []);

  const setExact = useCallback((id: string, val: string) => {
    setForm((f) => ({ ...f, exactAmounts: { ...f.exactAmounts, [id]: val } }));
  }, []);

  const setMode = useCallback((mode: TripSplitMode) => {
    setForm((f) => ({ ...f, splitMode: mode }));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const body = formToExpensePayload(form, accounts, isSelf(form.payerId));
      if (editing) await tripsApi.updateExpense(tripId, editing, body);
      else await tripsApi.createExpense(tripId, body);
      setOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  }, [editing, form, tripId, reload, isSelf, accounts]);

  const remove = useCallback(
    async (r: TripExpenseRow) => {
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
    active,
    saving,
    error,
    rateLoading,
    payerIsSelf: isSelf(form.payerId),
    openAdd,
    openEdit,
    close,
    setPayer,
    setAccount,
    setCurrency,
    toggleParticipant,
    selectAll,
    selectOnlyPayer,
    setExact,
    setMode,
    save,
    remove,
  };
}
