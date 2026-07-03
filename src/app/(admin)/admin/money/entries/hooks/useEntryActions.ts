import { moneyApi } from "@/lib/api/money";
import type { useConfirmDialog } from "@/hooks/useConfirmDialog";

/** Row-level entry actions — currently just delete, routed through the shared confirm dialog. */
export function useEntryActions(
  confirm: ReturnType<typeof useConfirmDialog>,
  onSuccess: () => Promise<void> | void
) {
  const requestDelete = (id: string) => {
    confirm.openConfirm(
      "Delete entry",
      "This permanently removes this ledger entry. This cannot be undone.",
      async () => {
        await moneyApi.deleteEntry(id);
        await onSuccess();
      },
      { confirmLabel: "Delete" }
    );
  };

  return { requestDelete };
}
