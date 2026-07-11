import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import { todayInput } from "../../format";
import { BLANK_TRANSFER, type TransferForm } from "../types";

/** Add-transfer drawer state (move money between two of the user's own accounts). */
export function useTransferDrawer(onSuccess: () => Promise<void> | void) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState<TransferForm>(BLANK_TRANSFER);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const openTransfer = () => {
    setTransfer({ ...BLANK_TRANSFER, date: todayInput() });
    setTransferError(null);
    setTransferOpen(true);
  };

  const saveTransfer = async () => {
    setTransferSaving(true);
    setTransferError(null);
    try {
      await moneyApi.transfer({
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
        amount: parseFloat(transfer.amount),
        date: transfer.date,
        description: transfer.description || null,
        ...(transfer.toAmount !== "" && { toAmount: parseFloat(transfer.toAmount) }),
        ...(transfer.fee !== "" && { fee: parseFloat(transfer.fee) }),
      });
      setTransferOpen(false);
      await onSuccess();
    } catch (e: unknown) {
      setTransferError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setTransferSaving(false);
    }
  };

  return {
    transferOpen,
    closeTransfer: () => setTransferOpen(false),
    transfer,
    setTransfer,
    transferSaving,
    transferError,
    openTransfer,
    saveTransfer,
  };
}
