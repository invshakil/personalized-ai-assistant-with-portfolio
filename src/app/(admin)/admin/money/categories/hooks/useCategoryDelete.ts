import { moneyApi } from "@/lib/api/money";
import type { MoneyCategoryRow } from "@/types";

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

/** Wires the shared confirm-dialog hook to the delete-category mutation. */
export function useCategoryDelete(openConfirm: OpenConfirm, onDeleted: () => void) {
  function deleteCategory(c: MoneyCategoryRow) {
    openConfirm(
      "Delete category",
      `Delete "${c.name}"? This cannot be undone.`,
      async () => {
        // A still-referenced category answers 400 and the Axios layer throws;
        // the { deleted: false } shape is a defensive fallback. Throw either
        // way so the confirm dialog stays open and shows the reason.
        const res = await moneyApi.deleteCategory(c.id);
        if (res && res.deleted === false)
          throw new Error(res.error ?? "Cannot delete this category.");
        onDeleted();
      },
      { confirmLabel: "Delete" }
    );
  }

  return { deleteCategory };
}
