import { useState } from "react";
import { moneyApi } from "@/lib/api/money";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import { pairValidValues, rememberAccountPair, seedAccountPair } from "@/lib/accountPicker";
import type { MoneyAccountRow } from "@/types";
import { todayInput } from "../../format";
import { BLANK_TRANSFER, type TransferForm } from "../types";

/** Add-transfer drawer state (move money between two of the user's own accounts). */
export function useTransferDrawer(
  onSuccess: () => Promise<void> | void,
  /** Accounts on offer — a default that is no longer selectable is dropped. */
  accounts: MoneyAccountRow[]
) {
  const defaults = useFormDefaults("money.transfer");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transfer, setTransfer] = useState<TransferForm>(BLANK_TRANSFER);
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  const openTransfer = () => {
    const seeded = defaults.seed({
      ...pairValidValues(accounts, { prefix: "from" }),
      ...pairValidValues(accounts, { prefix: "to" }),
    });
    const from = seedAccountPair(accounts, seeded, { prefix: "from" });
    const to = seedAccountPair(accounts, seeded, { prefix: "to" });
    setTransfer({
      ...BLANK_TRANSFER,
      date: todayInput(),
      fromAccountTypeId: from.typeId,
      fromAccountId: from.accountId,
      toAccountTypeId: to.typeId,
      toAccountId: to.accountId,
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
        ...rememberAccountPair(
          { typeId: transfer.fromAccountTypeId, accountId: transfer.fromAccountId },
          "from"
        ),
        ...rememberAccountPair(
          { typeId: transfer.toAccountTypeId, accountId: transfer.toAccountId },
          "to"
        ),
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
