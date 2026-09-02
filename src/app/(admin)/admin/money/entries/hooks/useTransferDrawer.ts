import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import { todayInput } from "../../format";
import { BLANK_TRANSFER, type TransferForm } from "../types";

/** Add-transfer drawer state (move money between two of the user's own accounts). */
export function useTransferDrawer(
  onSuccess: () => Promise<void> | void,
  /** Account ids currently on offer — used to drop a default that no longer exists. */
  accountIds: readonly string[] = []
) {
  const defaults = useFormDefaults("money.transfer");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState<TransferForm>(BLANK_TRANSFER);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const openTransfer = () => {
    setTransfer({
      ...BLANK_TRANSFER,
      date: todayInput(),
      ...defaults.seed({ fromAccountId: accountIds, toAccountId: accountIds }),
    });
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
      // Fire-and-forget; the server ignores anything not in "lastUsed" mode.
      // Both accounts start "fixed", so this is a no-op until the user switches
      // one in Settings — without it that switch would be a control that does
      // nothing, since this is the only place a transfer's choice is known.
      defaults.remember({
        fromAccountId: transfer.fromAccountId,
        toAccountId: transfer.toAccountId,
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
