import { useState } from "react";
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
import type { TenantForm } from "../types";

export function useTenantEditor(
  accounts: MoneyAccountRow[],
  onDataRefresh: (fresh: UnitWithTenant[]) => void,
  onSaved: () => Promise<void>
) {
  const [editTenantRow, setEditTenantRow] = useState<UnitWithTenant | null>(null);
  const [tenantForm, setTenantForm] = useState<TenantForm>({
    name: "",
    phone: "",
    moveInDate: "",
    leaseEndDate: "",
    advancePaid: false,
    advanceAmount: "0",
  });
  // The advance held when the drawer opened; the edit posts only the change from it.
  const [originalAdvance, setOriginalAdvance] = useState(0);
  // Optional Money-Manager account to post that change to (same default as Add Tenant).
  const [advanceAccount, setAdvanceAccount] = useState<AccountSelection>(EMPTY_SELECTION);
  const defaults = useFormDefaults("property.advance");
  const [saving, setSaving] = useState(false);

  const advanceDelta =
    (tenantForm.advancePaid ? Number(tenantForm.advanceAmount) || 0 : 0) - originalAdvance;

  function openTenantEdit(row: UnitWithTenant) {
    const t = row.tenant!;
    setEditTenantRow(row);
    setTenantForm({
      name: t.name,
      phone: t.phone ?? "",
      moveInDate: t.moveInDate.split("T")[0],
      leaseEndDate: t.leaseEndDate ? t.leaseEndDate.split("T")[0] : "",
      advancePaid: t.advancePaid,
      advanceAmount: String(t.advanceAmount),
    });
    setOriginalAdvance(t.advancePaid ? Number(t.advanceAmount) || 0 : 0);
    setAdvanceAccount(
      withKindFallback(
        accounts,
        seedAccountPair(accounts, defaults.seed(pairValidValues(accounts))),
        "CASH"
      )
    );
  }

  function closeTenantEdit() {
    setEditTenantRow(null);
  }

  async function saveTenant() {
    if (!editTenantRow?.tenant) return;
    setSaving(true);
    try {
      await propertyApi.updateTenant(editTenantRow.tenant.id, {
        name: tenantForm.name,
        phone: tenantForm.phone || null,
        moveInDate: tenantForm.moveInDate,
        leaseEndDate: tenantForm.leaseEndDate || null,
        advancePaid: tenantForm.advancePaid,
        advanceAmount: Number(tenantForm.advanceAmount),
        // Opt-in: post the difference in advance to the chosen account.
        ...(advanceDelta !== 0 && advanceAccount.accountId
          ? { advanceAccountId: advanceAccount.accountId }
          : {}),
      });
      if (advanceDelta !== 0 && advanceAccount.accountId) {
        defaults.remember(rememberAccountPair(advanceAccount));
      }
      setEditTenantRow(null);
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  /** Refetch units and re-point the open drawer at the freshened row (used after service/rent-change mutations). */
  async function refreshEditRow(tenantId: string) {
    const fresh: UnitWithTenant[] = (await propertyApi.listUnits()) ?? [];
    onDataRefresh(fresh);
    const freshRow = fresh.find((u) => u.tenant?.id === tenantId);
    if (freshRow) setEditTenantRow(freshRow);
  }

  return {
    editTenantRow,
    tenantForm,
    setTenantForm,
    advanceDelta,
    advanceAccount,
    setAdvanceAccount,
    saving,
    openTenantEdit,
    closeTenantEdit,
    saveTenant,
    refreshEditRow,
  };
}
