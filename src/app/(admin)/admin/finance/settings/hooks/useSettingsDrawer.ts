import { useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { EmployeeRow, SourceRow, CategoryRow } from "../../types";
import type { Kind, DrawerState } from "../types";

export function useSettingsDrawer(reloadFns: Record<Kind, () => Promise<void>>) {
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openAdd(kind: Kind) {
    setError(null);
    setDrawer({ kind, editingId: null, name: "", phone: "", notes: "", isActive: true });
  }

  function openEdit(kind: Kind, item: EmployeeRow | SourceRow | CategoryRow) {
    setError(null);
    setDrawer({
      kind,
      editingId: item.id,
      name: item.name,
      phone: "phone" in item ? (item.phone ?? "") : "",
      notes: "notes" in item ? (item.notes ?? "") : "",
      isActive: "isActive" in item ? item.isActive : true,
    });
  }

  function closeDrawer() {
    setDrawer(null);
  }

  async function save() {
    if (!drawer) return;
    setSaving(true);
    setError(null);
    try {
      const { kind, editingId, name, phone, notes, isActive } = drawer;
      if (kind === "employee") {
        const payload = { name, phone: phone || null, notes: notes || null, isActive };
        if (editingId) await financeApi.updateEmployee(editingId, payload);
        else await financeApi.createEmployee(payload);
      } else if (kind === "source") {
        const payload = { name, notes: notes || null };
        if (editingId) await financeApi.updateClient(editingId, payload);
        else await financeApi.createClient(payload);
      } else {
        if (editingId) await financeApi.updateCategory(editingId, { name });
        else await financeApi.createCategory({ name });
      }
      setDrawer(null);
      await reloadFns[kind]();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return { drawer, setDrawer, saving, error, openAdd, openEdit, closeDrawer, save };
}
