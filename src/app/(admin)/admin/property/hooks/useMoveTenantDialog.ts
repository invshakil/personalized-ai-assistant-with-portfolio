import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";

type TenantServices = NonNullable<UnitWithTenant["tenant"]>["services"];

interface MoveTenantDialogState {
  tenantId: string;
  tenantName: string;
  currentUnitId: string;
  services: TenantServices;
}

export function useMoveTenantDialog(units: UnitWithTenant[], onSuccess: () => Promise<void>) {
  const [moveTenantDialog, setMoveTenantDialog] = useState<MoveTenantDialogState | null>(null);
  const [moveTargetUnitId, setMoveTargetUnitId] = useState("");
  const [moveRent, setMoveRent] = useState("");
  const [moveDate, setMoveDate] = useState("");
  const [moveEndServiceIds, setMoveEndServiceIds] = useState<string[]>([]);
  const [moveAddSvcId, setMoveAddSvcId] = useState("");
  const [moveAddSvcFee, setMoveAddSvcFee] = useState("");
  const [moveSaving, setMoveSaving] = useState(false);

  function openMoveTenantDialog(
    tenantId: string,
    tenantName: string,
    currentUnitId: string,
    services: TenantServices
  ) {
    setMoveTenantDialog({ tenantId, tenantName, currentUnitId, services });
    setMoveTargetUnitId("");
    setMoveRent("");
    setMoveDate(new Date().toISOString().slice(0, 10));
    setMoveEndServiceIds([]);
    setMoveAddSvcId("");
    setMoveAddSvcFee("");
  }

  function closeMoveTenantDialog() {
    setMoveTenantDialog(null);
  }

  function selectMoveTargetUnit(uid: string) {
    setMoveTargetUnitId(uid);
    const u = units.find((x) => x.id === uid);
    setMoveRent(u ? String(u.monthlyRent) : "");
  }

  function toggleMoveEndService(tenantServiceId: string) {
    setMoveEndServiceIds((prev) =>
      prev.includes(tenantServiceId)
        ? prev.filter((id) => id !== tenantServiceId)
        : [...prev, tenantServiceId]
    );
  }

  async function doMoveTenant() {
    if (!moveTenantDialog || !moveTargetUnitId) return;
    setMoveSaving(true);
    try {
      const targetUnit = units.find((u) => u.id === moveTargetUnitId);
      await propertyApi.moveTenant(moveTenantDialog.tenantId, {
        newUnitId: moveTargetUnitId,
        moveDate: moveDate || undefined,
        newRent:
          moveRent && targetUnit && Number(moveRent) !== targetUnit.monthlyRent
            ? Number(moveRent)
            : undefined,
        endServiceIds: moveEndServiceIds.length ? moveEndServiceIds : undefined,
        newServices:
          moveAddSvcId && moveAddSvcFee !== ""
            ? [
                {
                  serviceId: moveAddSvcId,
                  monthlyFee: Number(moveAddSvcFee),
                  startDate: moveDate || undefined,
                },
              ]
            : undefined,
      });
      setMoveTenantDialog(null);
      await onSuccess();
    } finally {
      setMoveSaving(false);
    }
  }

  return {
    moveTenantDialog,
    moveTargetUnitId,
    moveRent,
    setMoveRent,
    moveDate,
    setMoveDate,
    moveEndServiceIds,
    toggleMoveEndService,
    moveAddSvcId,
    setMoveAddSvcId,
    moveAddSvcFee,
    setMoveAddSvcFee,
    moveSaving,
    openMoveTenantDialog,
    closeMoveTenantDialog,
    selectMoveTargetUnit,
    doMoveTenant,
  };
}
