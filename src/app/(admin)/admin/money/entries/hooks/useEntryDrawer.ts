import { useEffect, useState } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow, MoneyCategoryRow, MoneyEntryRow } from "@/types";
import { todayInput } from "../../format";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import { useObligationLink } from "./useObligationLink";
import {
  BLANK_ENTRY,
  categoryIdsFor,
  categoryKindFor,
  type EntryDir,
  type EntryForm,
} from "../types";

/** Add/edit drawer state for a single ledger entry, incl. the optional obligation link. */
export function useEntryDrawer(
  accounts: MoneyAccountRow[],
  categories: MoneyCategoryRow[],
  searchParams: ReadonlyURLSearchParams,
  setParams: (patch: Record<string, string | undefined>) => void,
  onSuccess: () => Promise<void> | void
) {
  const defaults = useFormDefaults("money.entry");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EntryForm>(BLANK_ENTRY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { linkLoading, linkObligations, linkObligationOptions } = useObligationLink(
    form.beneficiaryId,
    form.direction
  );
  const selectedObligation = linkObligations.find((o) => o.id === form.obligationId) ?? null;

  const formCategories = categories.filter((c) => c.kind === categoryKindFor(form.direction));

  const openAdd = () => {
    setEditing(null);
    // Defaults apply to a NEW entry only. openEdit must never seed from them —
    // that would quietly rewrite the record being edited.
    //
    // Each stored value is checked against the ids actually on offer, so a
    // default pointing at a deleted account degrades to an empty field rather
    // than a stale id that would fail on save.
    //
    // Categories are checked against the NEW form's direction, not every
    // category: a last-used income category would otherwise pass here, render
    // as an empty field (the expense dropdown has no option for it) and then be
    // refused by the server on save.
    const seeded = defaults.seed({
      accountId: accounts.map((a) => a.id),
      categoryId: categoryIdsFor(categories, BLANK_ENTRY.direction),
    });
    setForm({ ...BLANK_ENTRY, date: todayInput(), ...seeded });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: MoneyEntryRow) => {
    if (e.direction === "TRANSFER") return;
    setEditing(e.id);
    setForm({
      date: e.date.split("T")[0],
      direction: e.direction,
      amount: String(e.amount),
      categoryId: e.categoryId ?? "",
      accountId: e.accountId ?? "",
      description: e.description ?? "",
      notes: e.notes ?? "",
      beneficiaryId: e.beneficiaryId ?? "",
      obligationId: e.obligationId ?? "",
      method: e.method ?? "",
    });
    setError(null);
    setDrawerOpen(true);
  };

  const setDirection = (direction: EntryDir) =>
    setForm((f) => ({
      ...f,
      direction,
      // Drop a category that no longer matches the new direction's kind.
      categoryId:
        categories.find((c) => c.id === f.categoryId)?.kind === categoryKindFor(direction)
          ? f.categoryId
          : "",
      // A due is direction-specific; clear it so it can't mismatch the new type.
      obligationId: "",
      // Method only applies to CREDIT (deposit) entries.
      method: direction === "CREDIT" ? f.method : "",
    }));

  // Deep link from the Accounts page: "?deposit=<accountId>" opens this drawer
  // pre-filled to a CREDIT entry for that account (a quick "top up" action).
  useEffect(() => {
    const depositAccountId = searchParams.get("deposit");
    if (!depositAccountId || accounts.length === 0) return;
    setEditing(null);
    setForm({
      ...BLANK_ENTRY,
      direction: "CREDIT",
      accountId: depositAccountId,
      date: todayInput(),
    });
    setError(null);
    setDrawerOpen(true);
    setParams({ deposit: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const body = {
        date: form.date,
        direction: form.direction,
        amount: parseFloat(form.amount),
        categoryId: form.categoryId,
        accountId: form.accountId || null,
        description: form.description || null,
        notes: form.notes || null,
        beneficiaryId: form.beneficiaryId || null,
        // Only keep the due link when a person is selected and it still matches.
        obligationId: form.beneficiaryId ? form.obligationId || null : null,
        method: form.direction === "CREDIT" ? form.method || null : null,
      };
      if (editing) await moneyApi.updateEntry(editing, body);
      else await moneyApi.createEntry(body);
      // Fire-and-forget; the server ignores anything not in "lastUsed" mode, so
      // a pinned account is never overwritten by having been used.
      defaults.remember({ accountId: form.accountId, categoryId: form.categoryId });
      setDrawerOpen(false);
      await onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return {
    drawerOpen,
    closeDrawer: () => setDrawerOpen(false),
    editing,
    form,
    setForm,
    setDirection,
    saving,
    error,
    linkLoading,
    linkObligationOptions,
    selectedObligation,
    formCategories,
    openAdd,
    openEdit,
    save,
  };
}
