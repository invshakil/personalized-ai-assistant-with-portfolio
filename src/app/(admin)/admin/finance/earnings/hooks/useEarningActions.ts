import { useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { useConfirmDialog } from "@/hooks/useConfirmDialog";

export function useEarningActions(
  confirm: ReturnType<typeof useConfirmDialog>,
  onSuccess: () => Promise<void>
) {
  const [reversingId, setReversingId] = useState<string | null>(null);

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
    try {
      await financeApi.reverseConversion(id);
      await onSuccess();
    } catch {
      /* surfaced on reload */
    } finally {
      setReversingId(null);
    }
  };

  return { reversingId, requestDelete, doReverse };
}
