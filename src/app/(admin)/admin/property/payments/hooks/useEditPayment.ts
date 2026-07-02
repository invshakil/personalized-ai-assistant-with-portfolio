import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { EditPaymentState } from "../types";

export function useEditPayment(onSuccess: () => Promise<void>) {
  const [editPayment, setEditPayment] = useState<EditPaymentState | null>(null);
  const [editPaymentLoading, setEditPaymentLoading] = useState(false);
  const [editPaymentError, setEditPaymentError] = useState<string | null>(null);

  function openEditPayment(state: EditPaymentState) {
    setEditPayment(state);
  }

  function updateEditPayment(patch: Partial<EditPaymentState>) {
    setEditPayment((p) => (p ? { ...p, ...patch } : p));
  }

  async function submitEditPayment() {
    if (!editPayment) return;
    setEditPaymentLoading(true);
    setEditPaymentError(null);
    try {
      await propertyApi.updatePayment(editPayment.id, {
        rentDue: parseFloat(editPayment.rentDue),
        notes: editPayment.notes || null,
      });
      setEditPayment(null);
      await onSuccess();
    } catch (e: unknown) {
      setEditPaymentError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setEditPaymentLoading(false);
    }
  }

  return {
    editPayment,
    openEditPayment,
    updateEditPayment,
    closeEditPayment: () => setEditPayment(null),
    editPaymentLoading,
    editPaymentError,
    submitEditPayment,
  };
}
