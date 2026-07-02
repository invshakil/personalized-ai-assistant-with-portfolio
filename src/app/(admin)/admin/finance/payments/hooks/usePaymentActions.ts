import { financeApi } from "@/lib/api/finance";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

export function usePaymentActions(onSuccess: () => Promise<void>) {
  const confirm = useConfirmDialog();

  function requestDelete(id: string) {
    confirm.openConfirm(
      "Delete payment",
      "This permanently removes this salary payment record. This cannot be undone.",
      async () => {
        await financeApi.deletePayment(id);
        await onSuccess();
      },
      { confirmLabel: "Delete" }
    );
  }

  function downloadReceipt(id: string) {
    window.open(`/api/admin/finance/payments/${id}/receipt`, "_blank");
  }

  function downloadAll(fyFilter: string[], empFilter: string[]) {
    const qs = new URLSearchParams();
    if (fyFilter.length === 1) qs.set("fiscalYear", fyFilter[0]);
    if (empFilter.length === 1) qs.set("employeeId", empFilter[0]);
    window.open(`/api/admin/finance/payments/pdf?${qs.toString()}`, "_blank");
  }

  return { confirm, requestDelete, downloadReceipt, downloadAll };
}
