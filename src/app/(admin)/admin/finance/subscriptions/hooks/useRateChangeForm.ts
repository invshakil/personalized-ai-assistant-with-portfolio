import { useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { SubscriptionDetail } from "../../types";
import { BLANK_RC_FORM, type RcForm } from "../types";

interface Args {
  detail: SubscriptionDetail | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setManageError: (v: string | null) => void;
  refreshManage: (id: string) => Promise<void>;
}

export function useRateChangeForm({ detail, busy, setBusy, setManageError, refreshManage }: Args) {
  const [rcForm, setRcForm] = useState<RcForm>(BLANK_RC_FORM);
  const [showRcForm, setShowRcForm] = useState(false);

  const resetRcForm = () => {
    setRcForm(BLANK_RC_FORM);
    setShowRcForm(false);
  };

  const addRateChange = async () => {
    if (!detail) return;
    setBusy(true);
    setManageError(null);
    try {
      await financeApi.addRateChange(detail.id, {
        effectiveMonth: rcForm.effectiveMonth,
        monthlyAmount: parseFloat(rcForm.monthlyAmount),
        note: rcForm.note || null,
      });
      resetRcForm();
      await refreshManage(detail.id);
    } catch (e: unknown) {
      setManageError(e instanceof Error ? e.message : "Could not add price change");
    } finally {
      setBusy(false);
    }
  };

  const deleteRateChange = async (rcId: string) => {
    if (!detail) return;
    setBusy(true);
    try {
      await financeApi.deleteRateChange(detail.id, rcId);
      await refreshManage(detail.id);
    } finally {
      setBusy(false);
    }
  };

  return {
    rcForm,
    setRcForm,
    showRcForm,
    setShowRcForm,
    busy,
    resetRcForm,
    addRateChange,
    deleteRateChange,
  };
}
