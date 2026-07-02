import { financeApi } from "@/lib/api/finance";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import type { SubscriptionRow } from "../../types";

export function useSubscriptionActions(onSuccess: () => Promise<void>) {
  const confirm = useConfirmDialog();

  const askDelete = (id: string) => {
    confirm.openConfirm(
      "Delete subscription",
      "This removes the subscription and all of its generated monthly charges, price changes and adjustments from your history and reports. This cannot be undone.",
      async () => {
        await financeApi.deleteSubscription(id);
        await onSuccess();
      },
      { confirmLabel: "Delete", confirmColor: "error" }
    );
  };

  const askStop = (s: SubscriptionRow) => {
    confirm.openConfirm(
      "Stop subscription",
      `Stop "${s.name}" effective this month? This month stays charged; no charges will be generated after it. You can resume later.`,
      async () => {
        await financeApi.stopSubscription(s.id); // effective this month
        await onSuccess();
      },
      { confirmLabel: "Stop", confirmColor: "warning" }
    );
  };

  const resume = async (id: string) => {
    await financeApi.resumeSubscription(id);
    await onSuccess();
  };

  return { confirm, askDelete, askStop, resume };
}
