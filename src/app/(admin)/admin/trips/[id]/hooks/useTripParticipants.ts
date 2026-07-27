import { useCallback, useEffect, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { moneyApi } from "@/lib/api/money";
import type { BeneficiaryRow, TripParticipantRow } from "@/types";

export interface ParticipantForm {
  name: string;
  beneficiaryId: string;
  note: string;
}

const BLANK: ParticipantForm = { name: "", beneficiaryId: "", note: "" };

/** Add / edit / remove trip participants; also loads Beneficiaries for the optional link. */
export function useTripParticipants(tripId: string, reload: () => Promise<void>) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TripParticipantRow | null>(null);
  const [form, setForm] = useState<ParticipantForm>(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([]);

  useEffect(() => {
    moneyApi
      .listBeneficiaries()
      .then((b) => setBeneficiaries(b ?? []))
      .catch(() => setBeneficiaries([]));
  }, []);

  const openAdd = useCallback(() => {
    setEditing(null);
    setForm(BLANK);
    setError(null);
    setOpen(true);
  }, []);

  const openEdit = useCallback((p: TripParticipantRow) => {
    setEditing(p);
    setForm({ name: p.name, beneficiaryId: p.beneficiaryId ?? "", note: p.note ?? "" });
    setError(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        name: form.name,
        beneficiaryId: form.beneficiaryId || null,
        note: form.note || null,
      };
      if (editing) await tripsApi.updateParticipant(tripId, editing.id, body);
      else await tripsApi.createParticipant(tripId, body);
      setOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save participant");
    } finally {
      setSaving(false);
    }
  }, [editing, form, tripId, reload]);

  const remove = useCallback(
    async (p: TripParticipantRow) => {
      await tripsApi.deleteParticipant(tripId, p.id);
      await reload();
    },
    [tripId, reload]
  );

  return {
    open,
    editing,
    form,
    setForm,
    saving,
    error,
    beneficiaries,
    openAdd,
    openEdit,
    close,
    save,
    remove,
  };
}
