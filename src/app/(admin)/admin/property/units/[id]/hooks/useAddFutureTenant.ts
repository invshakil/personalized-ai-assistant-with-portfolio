import { useState, useEffect } from "react";
import { propertyApi } from "@/lib/api/property";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import {
  EMPTY_SELECTION,
  pairValidValues,
  rememberAccountPair,
  seedAccountPair,
  withKindFallback,
  type AccountSelection,
} from "@/lib/accountPicker";
import { BLANK_ADD_FUTURE_FORM, dayBefore, type AddFutureForm, type UnitDetail } from "../types";

export function useAddFutureTenant(
  unitId: string,
  unit: UnitDetail | null,
  onSuccess: () => Promise<void>
) {
  const [addFutureOpen, setAddFutureOpen] = useState(false);
  const [addFutureForm, setAddFutureForm] = useState<AddFutureForm>(BLANK_ADD_FUTURE_FORM);
  const [saving, setSaving] = useState(false);
  // Optional Money-Manager account to credit with the advance.
  const [advanceAccount, setAdvanceAccount] = useState<AccountSelection>(EMPTY_SELECTION);
  const defaults = useFormDefaults("property.advance");
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);

  // Money accounts for the optional advance wallet link (loaded once).
  useEffect(() => {
    moneyApi.listAccounts().then((a) => setAccounts(a ?? []));
  }, []);

  function openAddFuture() {
    // A stored default wins; with none, the first Cash account (as before).
    const seeded = seedAccountPair(accounts, defaults.seed(pairValidValues(accounts)));
    setAdvanceAccount(withKindFallback(accounts, seeded, "CASH"));
    setAddFutureOpen(true);
  }

  async function addFutureTenant() {
    if (!addFutureForm.name || !addFutureForm.moveInDate) return;
    setSaving(true);
    try {
      const newTenant = (await propertyApi.createTenant({
        name: addFutureForm.name,
        phone: addFutureForm.phone || null,
        unitId,
        moveInDate: addFutureForm.moveInDate,
        leaseEndDate: addFutureForm.leaseEndDate || null,
        advancePaid: addFutureForm.advancePaid,
        advanceAmount: addFutureForm.advancePaid ? Number(addFutureForm.advanceAmount) : 0,
        // Opt-in: post the advance into the chosen wallet (only when paid + picked).
        ...(addFutureForm.advancePaid && advanceAccount.accountId
          ? { advanceAccountId: advanceAccount.accountId }
          : {}),
        isExternal: false,
        // When a current tenant is being replaced, schedule their move-out.
        outgoingMoveOutDate: unit?.tenants.some((t) => t.tenantStatus === "CURRENT" && t.isActive)
          ? addFutureForm.outgoingMoveOutDate || dayBefore(addFutureForm.moveInDate) || null
          : null,
      })) as { id?: string } | null;
      // Schedule a rent change effective on move-in date if a custom rent was provided
      if (
        newTenant?.id &&
        addFutureForm.newRent &&
        unit &&
        Number(addFutureForm.newRent) !== unit.monthlyRent
      ) {
        await propertyApi.addRentChange(newTenant.id, {
          effectiveDate: addFutureForm.moveInDate,
          newRent: Number(addFutureForm.newRent),
          reason: "Scheduled with future tenant",
        });
      }
      setAddFutureOpen(false);
      setAddFutureForm(BLANK_ADD_FUTURE_FORM);
      if (addFutureForm.advancePaid) defaults.remember(rememberAccountPair(advanceAccount));
      await onSuccess();
    } finally {
      setSaving(false);
    }
  }

  return {
    addFutureOpen,
    setAddFutureOpen,
    addFutureForm,
    setAddFutureForm,
    saving,
    advanceAccount,
    setAdvanceAccount,
    accounts,
    openAddFuture,
    addFutureTenant,
  };
}
