import { useRef, useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { MoneyAccountRow, UnitWithTenant } from "@/types";
import { BLANK_ADD_TENANT_FORM, NO_ACCOUNT, dayBefore, type AddTenantForm } from "../types";

export function useAddTenantForm(
  units: UnitWithTenant[],
  accounts: MoneyAccountRow[],
  onSuccess: () => Promise<void>
) {
  const [addOpen, setAddOpen] = useState(false);
  const [isAddingExternal, setIsAddingExternal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const addFileInputRef = useRef<HTMLInputElement>(null);
  const [addForm, setAddForm] = useState<AddTenantForm>(BLANK_ADD_TENANT_FORM);
  // Optional Money-Manager wallet to credit with the advance.
  const [advanceAccountId, setAdvanceAccountId] = useState<string>(NO_ACCOUNT);
  const [saving, setSaving] = useState(false);

  const selectedUnit = units.find((u) => u.id === addForm.unitId);

  function openAddTenant(unitId = "") {
    setIsAddingExternal(false);
    setPendingFiles([]);
    setAddForm({ ...BLANK_ADD_TENANT_FORM, unitId });
    // Default to the first CASH account; user can change or clear.
    setAdvanceAccountId(accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT);
    setAddOpen(true);
  }

  function openAddExternal() {
    setIsAddingExternal(true);
    setPendingFiles([]);
    setAddForm(BLANK_ADD_TENANT_FORM);
    setAdvanceAccountId(accounts.find((a) => a.type === "CASH")?.id ?? NO_ACCOUNT);
    setAddOpen(true);
  }

  function addPendingFiles(files: File[]) {
    setPendingFiles((prev) => [...prev, ...files]);
  }

  function removePendingFile(index: number) {
    setPendingFiles((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function saveNewTenant() {
    if (!addForm.name || !addForm.moveInDate) return;
    if (!isAddingExternal && !addForm.unitId) return;
    setSaving(true);
    try {
      const selectedUnitData = units.find((u) => u.id === addForm.unitId);
      // For vacant units with a custom rent, update the unit before creating the tenant
      if (
        !isAddingExternal &&
        addForm.customRent &&
        addForm.unitId &&
        selectedUnitData &&
        !selectedUnitData.isOccupied
      ) {
        if (Number(addForm.customRent) !== selectedUnitData.monthlyRent) {
          await propertyApi.updateUnit(addForm.unitId, { monthlyRent: Number(addForm.customRent) });
        }
      }
      const newTenant = (await propertyApi.createTenant({
        name: addForm.name,
        phone: addForm.phone || null,
        unitId: isAddingExternal ? null : addForm.unitId || null,
        moveInDate: addForm.moveInDate,
        leaseEndDate: addForm.leaseEndDate || null,
        advancePaid: addForm.advancePaid,
        advanceAmount: addForm.advancePaid ? Number(addForm.advanceAmount) : 0,
        // Opt-in: post the advance into the chosen wallet (only when paid + picked).
        ...(addForm.advancePaid && advanceAccountId ? { advanceAccountId } : {}),
        isExternal: isAddingExternal,
        // Occupied unit → the new tenant is queued; schedule the current tenant's move-out.
        outgoingMoveOutDate:
          !isAddingExternal && selectedUnitData?.isOccupied
            ? addForm.outgoingMoveOutDate || dayBefore(addForm.moveInDate) || null
            : null,
      })) as { id?: string; tenantStatus?: string } | null;
      // For occupied units: schedule a rent change for the future tenant's move-in date
      if (
        newTenant?.id &&
        newTenant.tenantStatus === "FUTURE" &&
        addForm.customRent &&
        selectedUnitData &&
        Number(addForm.customRent) !== selectedUnitData.monthlyRent
      ) {
        await propertyApi.addRentChange(newTenant.id, {
          effectiveDate: addForm.moveInDate,
          newRent: Number(addForm.customRent),
          reason: "Scheduled with future tenant",
        });
      }
      // Upload any pending documents to the newly created tenant
      if (newTenant?.id && pendingFiles.length > 0) {
        const fd = new FormData();
        pendingFiles.forEach((f) => fd.append("files", f));
        await propertyApi.uploadTenantDocuments(newTenant.id, fd);
      }
      setPendingFiles([]);
      setAddOpen(false);
      await onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return {
    addOpen,
    setAddOpen,
    isAddingExternal,
    pendingFiles,
    addFileInputRef,
    addForm,
    setAddForm,
    advanceAccountId,
    setAdvanceAccountId,
    saving,
    selectedUnit,
    openAddTenant,
    openAddExternal,
    addPendingFiles,
    removePendingFile,
    saveNewTenant,
  };
}
