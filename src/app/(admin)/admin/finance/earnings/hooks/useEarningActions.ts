import { useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { useConfirmDialog } from "@/hooks/useConfirmDialog";

export function useEarningActions(
  confirm: ReturnType<typeof useConfirmDialog>,
  onSuccess: () => Promise<void>
) {
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reverseError, setReverseError] = useState<string | null>(null);

  const requestDelete = (id: string) => {
    confirm.openConfirm(
      "Delete earning",
      "This permanently removes this earning entry. This cannot be undone.",
      async () => {
        await financeApi.deleteEarning(id);
        await onSuccess();
      },
      { confirmLabel: "Delete" }
    );
  };

  const doReverse = async (id: string) => {
    setReversingId(id);
    setReverseError(null);
    try {
      await financeApi.reverseConversion(id);
      await onSuccess();
    } catch (e) {
      // Un-realizing income moves money in the ledger — a failure here is not
      // something to swallow and hope the next reload explains.
      setReverseError(e instanceof Error ? e.message : "Could not reverse the conversion.");
    } finally {
      setReversingId(null);
    }
  };

  return {
    reversingId,
    reverseError,
    clearReverseError: () => setReverseError(null),
    requestDelete,
    doReverse,
  };
}
