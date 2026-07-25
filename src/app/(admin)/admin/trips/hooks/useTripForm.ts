import { useCallback, useState } from "react";
import { tripsApi, type TripPayload } from "@/lib/api/trips";
import type { TripRow, TripStatus } from "@/types";
import { todayInput } from "../format";

export interface TripForm {
  name: string;
  destination: string;
  localCurrency: string;
  startDate: string;
  endDate: string;
  status: TripStatus;
  localWalletAccountId: string;
  notes: string;
  publicIntro: string;
}

const BLANK: TripForm = {
  name: "",
  destination: "",
  localCurrency: "MYR",
  startDate: todayInput(),
  endDate: "",
  status: "PLANNING",
  localWalletAccountId: "",
  notes: "",
  publicIntro: "",
};

/** Create/edit trip drawer state + save. */
export function useTripForm(reload: () => Promise<void>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<TripForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm(BLANK);
    setError(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((t: TripRow) => {
    setEditing(t.id);
    setForm({
      name: t.name,
      destination: t.destination,
      localCurrency: t.localCurrency,
      startDate: t.startDate.slice(0, 10),
      endDate: t.endDate?.slice(0, 10) ?? "",
      status: t.status,
      localWalletAccountId: t.localWalletAccountId ?? "",
      notes: t.notes ?? "",
      publicIntro: t.publicIntro ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: TripPayload = {
        name: form.name,
        destination: form.destination,
        localCurrency: form.localCurrency,
        startDate: form.startDate,
        endDate: form.endDate || null,
        status: form.status,
        localWalletAccountId: form.localWalletAccountId || null,
        notes: form.notes || null,
        publicIntro: form.publicIntro || null,
      };
      if (editing) await tripsApi.updateTrip(editing, payload);
      else await tripsApi.createTrip(payload);
      setDrawerOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save trip");
    } finally {
      setSaving(false);
    }
  }, [editing, form, reload]);

  return {
    drawerOpen,
    editing,
    form,
    setForm,
    saving,
    error,
    openAdd,
    openEdit,
    closeDrawer,
    save,
  };
}
