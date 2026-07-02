import { useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { SubscriptionDetail } from "../../types";
import { monthInput, type AdjustingState } from "../types";

interface Args {
  detail: SubscriptionDetail | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setManageError: (v: string | null) => void;
  refreshManage: (id: string) => Promise<void>;
}

export function useChargeOverride({ detail, busy, setBusy, setManageError, refreshManage }: Args) {
  const [adjusting, setAdjusting] = useState<AdjustingState | null>(null);

  const startAdjust = (chargeId: string, amount: number, note: string | null) => {
    setAdjusting({ chargeId, amount: String(amount), note: note ?? "" });
  };

  const saveOverride = async () => {
    if (!detail || !adjusting) return;
    const charge = detail.charges.find((c) => c.id === adjusting.chargeId);
    if (!charge?.date) return;
    setBusy(true);
    setManageError(null);
    try {
      await financeApi.setOverride(detail.id, {
        month: monthInput(charge.date),
        amount: parseFloat(adjusting.amount),
        note: adjusting.note || null,
      });
      setAdjusting(null);
      await refreshManage(detail.id);
    } catch (e: unknown) {
      setManageError(e instanceof Error ? e.message : "Could not save adjustment");
    } finally {
      setBusy(false);
    }
  };

  const clearOverride = async (month: string | null) => {
    if (!detail || !month) return;
    setBusy(true);
    try {
      await financeApi.clearOverride(detail.id, monthInput(month));
      setAdjusting(null);
      await refreshManage(detail.id);
    } finally {
      setBusy(false);
    }
  };

  return {
    adjusting,
    setAdjusting,
    busy,
    startAdjust,
    saveOverride,
    clearOverride,
  };
}
