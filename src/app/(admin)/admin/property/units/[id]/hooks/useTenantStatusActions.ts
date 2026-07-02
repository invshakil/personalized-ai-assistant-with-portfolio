import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { propertyApi } from "@/lib/api/property";
import type { TenantHistory, UnitDetail } from "../types";

export function useTenantStatusActions(unit: UnitDetail | null, onSuccess: () => Promise<void>) {
  const confirm = useConfirmDialog();

  function moveOut(t: TenantHistory) {
    const hasFuture = !!unit?.tenants.find((x) => x.tenantStatus === "FUTURE" && x.isActive);
    confirm.openConfirm(
      "Move Out Tenant",
      hasFuture
        ? `Move out ${t.name}? The scheduled future tenant will automatically become current.`
        : `Move out ${t.name}? The unit will become vacant.`,
      async () => {
        await propertyApi.deactivateTenant(t.id);
        await onSuccess();
      },
      { confirmLabel: "Move Out", confirmColor: "error" }
    );
  }

  function promoteNow(current: TenantHistory, future: TenantHistory) {
    confirm.openConfirm(
      "Promote to Current Tenant",
      `Promote ${future.name} to current tenant now? ${current.name} will be moved out.`,
      async () => {
        await propertyApi.deactivateTenant(current.id);
        await onSuccess();
      },
      { confirmLabel: "Promote", confirmColor: "warning" }
    );
  }

  return { ...confirm, moveOut, promoteNow };
}
