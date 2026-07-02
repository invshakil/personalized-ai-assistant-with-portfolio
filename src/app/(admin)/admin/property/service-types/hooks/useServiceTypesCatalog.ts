import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PropertyServiceType } from "@/types";
import { EMPTY_SERVICE_TYPE_FORM, type ServiceTypeForm } from "../types";

export function useServiceTypesCatalog() {
  const [types, setTypes] = useState<PropertyServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<ServiceTypeForm>(EMPTY_SERVICE_TYPE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTypes((await propertyApi.listServiceTypes()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_SERVICE_TYPE_FORM);
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(t: PropertyServiceType) {
    setEditing(t.id);
    setForm({ name: t.name, category: t.category, description: t.description ?? "" });
    setError(null);
    setDrawerOpen(true);
  }

  async function save() {
    if (!form.name) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) await propertyApi.updateServiceType(editing, form);
      else await propertyApi.createServiceType(form);
      setDrawerOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t: PropertyServiceType) {
    await propertyApi.updateServiceType(t.id, { isActive: !t.isActive });
    await load();
  }

  return {
    types,
    loading,
    drawerOpen,
    editing,
    form,
    setForm,
    saving,
    error,
    openAdd,
    openEdit,
    closeDrawer: () => setDrawerOpen(false),
    save,
    toggleActive,
    reload: load,
  };
}
