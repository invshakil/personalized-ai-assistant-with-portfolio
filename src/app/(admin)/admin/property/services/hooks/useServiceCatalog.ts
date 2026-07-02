import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { ServiceEntry, TenantOption } from "../types";

export function useServiceCatalog() {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [tenants, setTenants] = useState<TenantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceEntry | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [servicesData, tenantsData] = await Promise.all([
        propertyApi.listServices(),
        propertyApi.listTenants("all"),
      ]);
      setServices((servicesData as ServiceEntry[]) ?? []);
      setTenants((tenantsData as unknown as TenantOption[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setEditingService(null);
    setName("");
    setDescription("");
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(s: ServiceEntry) {
    setEditingService(s);
    setName(s.name);
    setDescription(s.description ?? "");
    setError(null);
    setDrawerOpen(true);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const body = { name, description: description || null };
      if (editingService) await propertyApi.updateService(editingService.id, body);
      else await propertyApi.createService(body);
      setDrawerOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: string) {
    if (!confirm("Deactivate this service?")) return;
    setError(null);
    try {
      await propertyApi.deleteService(id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  return {
    services,
    tenants,
    loading,
    drawerOpen,
    editingService,
    name,
    setName,
    description,
    setDescription,
    saving,
    error,
    openAdd,
    openEdit,
    closeDrawer: () => setDrawerOpen(false),
    save,
    deactivate,
    reload: load,
  };
}
