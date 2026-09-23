import { useRef, useState } from "react";
import { propertyApi } from "@/lib/api/property";
import type { MoneyAccountRow, UnitWithTenant } from "@/types";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import {
  EMPTY_SELECTION,
  pairValidValues,
  rememberAccountPair,
  seedAccountPair,
  withKindFallback,
  type AccountSelection,
} from "@/lib/accountPicker";
import { BLANK_ADD_TENANT_FORM, dayBefore, type AddTenantForm } from "../types";

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
  // Optional Money-Manager account to credit with the advance.
  const [advanceAccount, setAdvanceAccount] = useState<AccountSelection>(EMPTY_SELECTION);
  const defaults = useFormDefaults("property.advance");
  // A stored default wins; with none, the first Cash account (as before).
  const seedAdvanceAccount = () =>
    setAdvanceAccount(
      withKindFallback(
        accounts,
        seedAccountPair(accounts, defaults.seed(pairValidValues(accounts))),
        "CASH"
      )
    );
  const [saving, setSaving] = useState(false);

  const selectedUnit = units.find((u) => u.id === addForm.unitId);

  function openAddTenant(unitId = "") {
    setIsAddingExternal(false);
    setPendingFiles([]);
    setAddForm({ ...BLANK_ADD_TENANT_FORM, unitId });
    seedAdvanceAccount();
    setAddOpen(true);
  }

  function openAddExternal() {
    setIsAddingExternal(true);
    setPendingFiles([]);
    setAddForm(BLANK_ADD_TENANT_FORM);
    seedAdvanceAccount();
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
        ...(addForm.advancePaid && advanceAccount.accountId
          ? { advanceAccountId: advanceAccount.accountId }
          : {}),
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
      if (addForm.advancePaid) defaults.remember(rememberAccountPair(advanceAccount));
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
    advanceAccount,
    setAdvanceAccount,
    saving,
    selectedUnit,
    openAddTenant,
    openAddExternal,
    addPendingFiles,
    removePendingFile,
    saveNewTenant,
  };
}
