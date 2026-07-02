import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { propertyApi } from "@/lib/api/property";
import type { UnitDetail, UnitEditForm } from "../types";

export function useUnitDetail(unitId: string) {
  const router = useRouter();
  const [unit, setUnit] = useState<UnitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<UnitEditForm>({
    unitNumber: "",
    floor: "",
    monthlyRent: "",
    description: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const u = await propertyApi.getUnit<UnitDetail>(unitId);
      setUnit(u);
      setEditForm({
        unitNumber: u.unitNumber,
        floor: u.floor,
        monthlyRent: String(u.monthlyRent),
        description: u.description ?? "",
        notes: u.notes ?? "",
      });
    } catch {
      router.push("/admin/property");
    } finally {
      setLoading(false);
    }
  }, [unitId, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveUnit() {
    setSaving(true);
    try {
      await propertyApi.updateUnit(unitId, {
        unitNumber: editForm.unitNumber,
        floor: editForm.floor,
        monthlyRent: Number(editForm.monthlyRent),
        description: editForm.description || null,
        notes: editForm.notes || null,
      });
      setEditMode(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return {
    unit,
    loading,
    saving,
    editMode,
    setEditMode,
    editForm,
    setEditForm,
    saveUnit,
    reload: load,
  };
}
