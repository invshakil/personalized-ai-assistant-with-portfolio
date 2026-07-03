import { moneyApi } from "@/lib/api/money";
import type { ImportBatchRow } from "@/lib/api/money";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

/** Rollback flow for a past import batch — wired through the shared confirm-dialog hook. */
export function useDeleteImportBatch(onSuccess: () => Promise<void>) {
  const confirm = useConfirmDialog();

  function requestDelete(batch: ImportBatchRow) {
    confirm.openConfirm(
      "Roll back import",
      `Delete all ${batch.currentEntryCount} entries imported from "${batch.fileName}"? This cannot be undone.`,
      async () => {
        await moneyApi.deleteImportBatch(batch.id);
        await onSuccess();
      },
      { confirmLabel: "Delete entries" }
    );
  }

  return { ...confirm, requestDelete };
}
