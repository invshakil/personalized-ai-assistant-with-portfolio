import { useState } from "react";
import { propertyApi } from "@/lib/api/property";

export function usePaymentHistory(onDeleted: () => Promise<void>) {
  const [expandedPayments, setExpandedPayments] = useState<Set<string>>(new Set());
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  function togglePayment(pid: string) {
    setExpandedPayments((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  }

  async function deletePayment(pid: string) {
    if (!confirm("Delete this payment record? This cannot be undone.")) return;
    setDeletingPaymentId(pid);
    try {
      await propertyApi.deletePayment(pid);
      await onDeleted();
    } finally {
      setDeletingPaymentId(null);
    }
  }

  return { expandedPayments, togglePayment, deletingPaymentId, deletePayment };
}
