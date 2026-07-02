import { propertyApi } from "@/lib/api/property";

export function useTenantActivation(
  openConfirm: (
    title: string,
    message: string,
    onConfirm: () => Promise<void>,
    opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
  ) => void,
  reloadUnits: () => Promise<void>,
  reloadInactive: () => Promise<void>
) {
  function deactivateTenant(id: string, name: string) {
    openConfirm(
      "Deactivate Tenant",
      `Are you sure you want to deactivate ${name}? They will be unassigned from their unit.`,
      async () => {
        await propertyApi.deactivateTenant(id);
        await reloadUnits();
      },
      { confirmLabel: "Deactivate", confirmColor: "error" }
    );
  }

  function activateTenant(id: string, name: string) {
    openConfirm(
      "Re-activate Tenant",
      `Re-activate ${name}? Their record will be restored as active. You can then assign them to a unit.`,
      async () => {
        await propertyApi.activateTenant(id);
        await reloadInactive();
        await reloadUnits();
      },
      { confirmLabel: "Re-activate", confirmColor: "success" }
    );
  }

  return { deactivateTenant, activateTenant };
}
