import { useCallback, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { moneyApi } from "@/lib/api/money";
import type { TripSettlementRow } from "@/types";
import { todayInput } from "../../format";

export interface SettlementForm {
  date: string;
  fromParticipantId: string;
  toParticipantId: string;
  amount: string;
  currency: string;
  fxRate: string;
  note: string;
}

function blank(): SettlementForm {
  return {
    date: todayInput(),
    fromParticipantId: "",
    toParticipantId: "",
    amount: "",
    currency: "BDT",
    fxRate: "",
    note: "",
  };
}

/** Record / delete a settlement (collect fund / settle up) — pure trip ledger. */
export function useTripSettlements(tripId: string, reload: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SettlementForm>(blank());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(false);

  const openDrawer = useCallback(() => {
    setForm(blank());
    setError(null);
    setOpen(true);
  }, []);
  const close = useCallback(() => setOpen(false), []);

  /** Change currency; prefill the live rate for a foreign one. */
  const setCurrency = useCallback(async (cur: string) => {
    setForm((f) => ({ ...f, currency: cur, fxRate: cur === "BDT" ? "" : f.fxRate }));
    if (cur === "BDT") return;
    setRateLoading(true);
    try {
      const r = await moneyApi.getFxRate(cur);
      if (r?.rate) setForm((f) => ({ ...f, fxRate: String(r.rate) }));
    } finally {
      setRateLoading(false);
    }
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const foreign = form.currency !== "BDT";
      await tripsApi.createSettlement(tripId, {
        date: form.date,
        fromParticipantId: form.fromParticipantId,
        toParticipantId: form.toParticipantId,
        amount: Number(form.amount),
        currency: form.currency,
        ...(foreign && form.fxRate ? { fxRate: Number(form.fxRate) } : {}),
        note: form.note || null,
      });
      setOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to record settlement");
    } finally {
      setSaving(false);
    }
  }, [form, tripId, reload]);

  const remove = useCallback(
    async (s: TripSettlementRow) => {
      await tripsApi.deleteSettlement(tripId, s.id);
      await reload();
    },
    [tripId, reload]
  );

  return {
    open,
    form,
    setForm,
    saving,
    error,
    rateLoading,
    openDrawer,
    close,
    setCurrency,
    save,
    remove,
  };
}
