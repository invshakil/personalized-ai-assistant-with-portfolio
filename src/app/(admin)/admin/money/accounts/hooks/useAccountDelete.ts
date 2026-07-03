import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

/** Wires the shared confirm-dialog hook to the delete-account mutation. */
export function useAccountDelete(
  openConfirm: OpenConfirm,
  onDeleted: () => void,
  onError: (message: string) => void
) {
  function deleteAccount(a: MoneyAccountRow) {
    openConfirm(
      "Delete account",
      `Delete "${a.name}"? This cannot be undone.`,
      async () => {
        try {
          const res = await moneyApi.deleteAccount(a.id);
          if (res && res.deleted === false) {
            onError(res.error ?? "Cannot delete this account.");
            return;
          }
          onDeleted();
        } catch (e: unknown) {
          onError(e instanceof Error ? e.message : "Failed to delete");
        }
      },
      { confirmLabel: "Delete" }
    );
  }

  return { deleteAccount };
}
