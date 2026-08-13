import { useState, useCallback } from "react";
import type { PaymentWithTenant } from "@/types";

export interface BillLineTarget {
  tenantId: string;
  tenantName: string;
  month: number;
  year: number;
}

/** The minimum shape a bill line needs to be listed and removed in the drawer. */
export interface BillLine {
  id: string;
  label: string;
  amount: number;
  notes: string | null;
}

export interface BillLineApi<T extends BillLine> {
  list(params: { tenantId: string; month: number; year: number }): Promise<T[] | undefined>;
  create(body: {
    tenantId: string;
    label: string;
    amount: number;
    month: number;
    year: number;
    notes: string | null;
  }): Promise<unknown>;
  remove(id: string): Promise<unknown>;
  /** Shown in the window.confirm before a line is deleted. */
  removeConfirm: string;
}

/**
 * Shared state for the two bill-adjustment drawers on the Payments page —
 * one-off charges (added to the bill) and vouchers (credited against it). Both
 * are scoped to a single tenant + billing period, re-fetch their own list after
 * each mutation, and call `onSuccess` so the payments table picks up the new
 * rentDue/status (each service adjusts the generated bill in step).
 */
export function useBillLines<T extends BillLine>(
  api: BillLineApi<T>,
  onSuccess: () => Promise<void>
) {
  const [target, setTarget] = useState<BillLineTarget | null>(null);
  const [lines, setLines] = useState<T[]>([]);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (t: BillLineTarget) => {
      const rows = await api.list({ tenantId: t.tenantId, month: t.month, year: t.year });
      setLines(rows ?? []);
    },
    [api]
  );

  const open = useCallback(
    async (payment: PaymentWithTenant) => {
      const t: BillLineTarget = {
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
      setLines([]);
      await refresh(t);
    },
    [refresh]
  );

  const close = useCallback(() => setTarget(null), []);

  const add = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    setError(null);
    try {
      await api.create({
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
  }, [api, target, label, amount, notes, refresh, onSuccess]);

  const remove = useCallback(
    async (id: string) => {
      if (!target) return;
      if (!window.confirm(api.removeConfirm)) return;
      setError(null);
      try {
        await api.remove(id);
        await refresh(target);
        await onSuccess();
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    },
    [api, target, refresh, onSuccess]
  );

  return {
    target,
    lines,
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
    add,
    remove,
  };
}
