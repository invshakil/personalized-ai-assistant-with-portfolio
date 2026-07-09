import { useState, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { OneOffCharge, PaymentWithTenant } from "@/types";

export interface ChargesTarget {
  tenantId: string;
  tenantName: string;
  month: number;
  year: number;
}

/**
 * Manage one-off charges for a single billing period from the Payments page.
 * The drawer is self-contained: it re-fetches the period's charges after every
 * mutation, and calls `onSuccess` so the payments table picks up the new
 * rentDue/status (the charge service adjusts the generated bill in step).
 */
export function useOneOffCharges(onSuccess: () => Promise<void>) {
  const [target, setTarget] = useState<ChargesTarget | null>(null);
  const [charges, setCharges] = useState<OneOffCharge[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (t: ChargesTarget) => {
    const rows = await propertyApi.listOneOffCharges({
      tenantId: t.tenantId,
      month: t.month,
      year: t.year,
    });
    setCharges(rows ?? []);
  }, []);

  const open = useCallback(
    async (payment: PaymentWithTenant) => {
      const t: ChargesTarget = {
        tenantId: payment.tenantId,
        tenantName: payment.tenantName,
        month: payment.month,
        year: payment.year,
      };
      setTarget(t);
      setLabel("");
      setAmount("");
      setNotes("");
      setError(null);
      setCharges([]);
      await refresh(t);
    },
    [refresh]
  );

  const close = useCallback(() => setTarget(null), []);

  const addCharge = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      await propertyApi.createOneOffCharge({
        tenantId: target.tenantId,
        label,
        amount: parseFloat(amount),
        month: target.month,
        year: target.year,
        notes: notes || null,
      });
      setLabel("");
      setAmount("");
      setNotes("");
      await refresh(target);
      await onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [target, label, amount, notes, refresh, onSuccess]);

  const removeCharge = useCallback(
    async (id: string) => {
      if (!target) return;
      if (!window.confirm("Remove this charge? It will be deducted from the month's bill.")) return;
      setError(null);
      try {
        await propertyApi.deleteOneOffCharge(id);
        await refresh(target);
        await onSuccess();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    },
    [target, refresh, onSuccess]
  );

  return {
    target,
    charges,
    label,
    setLabel,
    amount,
    setAmount,
    notes,
    setNotes,
    loading,
    error,
    open,
    close,
    addCharge,
    removeCharge,
  };
}
