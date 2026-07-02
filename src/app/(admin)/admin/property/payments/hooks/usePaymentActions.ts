import { propertyApi } from "@/lib/api/property";

export function usePaymentActions(onSuccess: () => Promise<void>) {
  async function deletePayment(id: string, tenantName: string) {
    if (
      !window.confirm(
        `Delete the payment record for ${tenantName}? All transactions will be removed and any advance applied will be restored.`
      )
    )
      return;
    await propertyApi.deletePayment(id);
    await onSuccess();
  }

  async function deleteTransaction(txId: string, isAdvance: boolean) {
    const msg = isAdvance
      ? "Delete this advance entry? The advance amount will be restored to the tenant's balance."
      : "Delete this transaction?";
    if (!window.confirm(msg)) return;
    await propertyApi.deletePaymentTransaction(txId);
    await onSuccess();
  }

  return { deletePayment, deleteTransaction };
}
