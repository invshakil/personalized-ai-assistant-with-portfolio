import { useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { UnitWithTenant } from "@/types";
import { dayBefore } from "../types";

interface AssignUnitDialogState {
  tenantId: string;
  tenantName: string;
  tenantMoveInDate: string;
}

export function useAssignUnitDialog(units: UnitWithTenant[], onSuccess: () => Promise<void>) {
  const [assignUnitDialog, setAssignUnitDialog] = useState<AssignUnitDialogState | null>(null);
  const [assigningUnitId, setAssigningUnitId] = useState("");
  const [assignRent, setAssignRent] = useState("");
  const [assignOutgoingMoveOut, setAssignOutgoingMoveOut] = useState("");
  const [assignSaving, setAssignSaving] = useState(false);

  function openAssignUnitDialog(tenantId: string, tenantName: string, moveInDate: string) {
    setAssignUnitDialog({
      tenantId,
      tenantName,
      tenantMoveInDate: moveInDate?.split("T")[0] ?? "",
    });
    setAssigningUnitId("");
    setAssignRent("");
    setAssignOutgoingMoveOut("");
  }

  function closeAssignUnitDialog() {
    setAssignUnitDialog(null);
  }

  function selectAssigningUnit(uid: string) {
    setAssigningUnitId(uid);
    setAssignRent("");
    const u = units.find((x) => x.id === uid);
    setAssignOutgoingMoveOut(
      u?.isOccupied ? dayBefore(assignUnitDialog?.tenantMoveInDate ?? "") : ""
    );
  }

  async function doAssignUnit() {
    if (!assignUnitDialog || !assigningUnitId) return;
    setAssignSaving(true);
    try {
      const targetUnit = units.find((u) => u.id === assigningUnitId);
      const newTenant = (await propertyApi.updateTenant(assignUnitDialog.tenantId, {
        unitId: assigningUnitId,
        // Occupied unit → schedule the current tenant's move-out.
        outgoingMoveOutDate: targetUnit?.isOccupied
          ? assignOutgoingMoveOut || dayBefore(assignUnitDialog.tenantMoveInDate) || null
          : null,
      })) as { id?: string; tenantStatus?: string; moveInDate?: string } | null;
      if (
        newTenant?.id &&
        assignRent &&
        targetUnit &&
        Number(assignRent) !== targetUnit.monthlyRent
      ) {
        if (newTenant.tenantStatus === "CURRENT") {
          // Vacant unit: update the unit's base rent immediately
          await propertyApi.updateUnit(assigningUnitId, { monthlyRent: Number(assignRent) });
        } else {
          // Occupied unit: schedule a rent change effective on move-in date
          await propertyApi.addRentChange(newTenant.id, {
            effectiveDate: newTenant.moveInDate!,
            newRent: Number(assignRent),
            reason: "Set when assigning unit",
          });
        }
      }
      setAssignUnitDialog(null);
      setAssigningUnitId("");
      setAssignRent("");
      setAssignOutgoingMoveOut("");
      await onSuccess();
    } finally {
      setAssignSaving(false);
    }
  }

  return {
    assignUnitDialog,
    assigningUnitId,
    assignRent,
    setAssignRent,
    assignOutgoingMoveOut,
    setAssignOutgoingMoveOut,
    assignSaving,
    openAssignUnitDialog,
    closeAssignUnitDialog,
    selectAssigningUnit,
    doAssignUnit,
  };
}
