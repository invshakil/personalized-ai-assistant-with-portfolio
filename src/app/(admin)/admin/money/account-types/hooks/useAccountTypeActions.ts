import { moneyApi } from "@/lib/api/money";
import type { AccountTypeRow } from "@/types";

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

/** Archive / reactivate / delete, each behind the shared confirm dialog. */
export function useAccountTypeActions(openConfirm: OpenConfirm, onDone: () => void) {
  function archive(t: AccountTypeRow) {
    const under =
      t.accountCount > 0
        ? ` Its ${t.accountCount} account${t.accountCount === 1 ? "" : "s"} will also disappear from every account picker.`
        : "";
    openConfirm(
      "Archive account type",
      `Archive "${t.name}"? It will no longer be selectable anywhere.${under} History is kept, and you can reactivate it at any time.`,
      async () => {
        await moneyApi.updateAccountType(t.id, { isActive: false });
        onDone();
      },
      { confirmLabel: "Archive", confirmColor: "warning" }
    );
  }

  async function reactivate(t: AccountTypeRow) {
    await moneyApi.updateAccountType(t.id, { isActive: true });
    onDone();
  }

  function remove(t: AccountTypeRow) {
    // Only reachable for a type with no accounts — the row gates the button.
    openConfirm(
      "Delete account type",
      `Delete "${t.name}"? This cannot be undone.`,
      async () => {
        const res = await moneyApi.deleteAccountType(t.id);
        if (res && res.deleted === false) throw new Error(res.error ?? "Cannot delete this type.");
        onDone();
      },
      { confirmLabel: "Delete" }
    );
  }

  return { archive, reactivate, remove };
}
