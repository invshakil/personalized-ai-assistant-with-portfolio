import { useCallback, useRef, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { TRIP_CATEGORIES, type TripBudgetRow, type TripCategory } from "@/types";

/** Edit all trip budgets at once (one PUT per category, upserted). */
export function useTripBudgets(
  tripId: string,
  budgets: TripBudgetRow[],
  reload: () => Promise<void>
) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialRef = useRef<Record<string, string>>({});

  const openEdit = useCallback(() => {
    const seed: Record<string, string> = {};
    for (const c of TRIP_CATEGORIES) {
      const b = budgets.find((x) => x.category === c);
      seed[c] = b && b.plannedAmount ? String(b.plannedAmount) : "";
    }
    initialRef.current = seed;
    setForm(seed);
    setError(null);
    setOpen(true);
  }, [budgets]);

  const close = useCallback(() => setOpen(false), []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      // Only persist categories whose amount actually changed.
      const changed = TRIP_CATEGORIES.filter(
        (c) => Number(form[c] || 0) !== Number(initialRef.current[c] || 0)
      );
      for (const c of changed) {
        await tripsApi.setBudget(tripId, {
          category: c as TripCategory,
          plannedAmount: Number(form[c] || 0),
        });
      }
      setOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save budgets");
    } finally {
      setSaving(false);
    }
  }, [form, tripId, reload]);

  return { open, form, setForm, saving, error, openEdit, close, save };
}
