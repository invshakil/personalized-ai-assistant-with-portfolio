import { financeApi } from "@/lib/api/finance";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

/** Delete-expense flow — wired through the shared confirm-dialog hook. */
export function useExpenseDelete(onSuccess: () => Promise<void>) {
  const confirm = useConfirmDialog();

  function requestDelete(id: string) {
    confirm.openConfirm(
      "Delete expense",
      "This permanently removes this expense entry. This cannot be undone.",
      async () => {
        await financeApi.deleteExpense(id);
        await onSuccess();
      },
      { confirmLabel: "Delete" }
    );
  }

  return { ...confirm, requestDelete };
}
