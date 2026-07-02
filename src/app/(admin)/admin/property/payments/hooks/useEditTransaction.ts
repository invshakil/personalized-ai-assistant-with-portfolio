import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PaymentTransaction } from "@/types";
import type { EditTxState } from "../types";

export function useEditTransaction(onSuccess: () => Promise<void>) {
  const [editTx, setEditTx] = useState<EditTxState | null>(null);
  const [editTxType, setEditTxType] = useState("CASH");
  const [editTxAmount, setEditTxAmount] = useState("");
  const [editTxDate, setEditTxDate] = useState("");
  const [editTxNotes, setEditTxNotes] = useState("");
  const [editTxLoading, setEditTxLoading] = useState(false);
  const [editTxError, setEditTxError] = useState<string | null>(null);

  function openEditTx(tx: PaymentTransaction) {
    setEditTx({ id: tx.id, paymentId: tx.paymentId });
    setEditTxType(tx.type);
    setEditTxAmount(String(tx.amount));
    setEditTxDate(tx.date.split("T")[0]);
    setEditTxNotes(tx.notes ?? "");
    setEditTxError(null);
  }

  async function submitEditTransaction() {
    if (!editTx) return;
    setEditTxLoading(true);
    setEditTxError(null);
    try {
      await propertyApi.updatePaymentTransaction(editTx.id, {
        type: editTxType,
        amount: parseFloat(editTxAmount),
        date: editTxDate,
        notes: editTxNotes || null,
      });
      setEditTx(null);
      await onSuccess();
    } catch (e: unknown) {
      setEditTxError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setEditTxLoading(false);
    }
  }

  return {
    editTx,
    openEditTx,
    closeEditTx: () => setEditTx(null),
    editTxType,
    setEditTxType,
    editTxAmount,
    setEditTxAmount,
    editTxDate,
    setEditTxDate,
    editTxNotes,
    setEditTxNotes,
    editTxLoading,
    editTxError,
    submitEditTransaction,
  };
}
