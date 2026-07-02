import { useCallback, useState } from "react";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { financeApi } from "@/lib/api/finance";
import type { MoneyAccountRow } from "@/types";
import type { EarningRow, SourceRow } from "../../types";
import { fmtDate, todayInput } from "../../format";
import { BLANK_EARNING_FORM, NO_ACCOUNT, type EarningForm } from "../types";

export function useEarningDrawer(
  sources: SourceRow[],
  accounts: MoneyAccountRow[],
  onSuccess: () => Promise<void>
) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<EarningForm>(BLANK_EARNING_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [rateNote, setRateNote] = useState<string | null>(null);

  const defaultAccountId = () => accounts.find((a) => a.type === "BANK")?.id ?? NO_ACCOUNT;

  const openAdd = () => {
    setEditing(null);
    setForm({
      ...BLANK_EARNING_FORM,
      date: todayInput(),
      fiscalYear: fiscalYearOf(new Date()),
      sourceId: sources[0]?.id ?? "",
      accountId: defaultAccountId(),
    });
    setError(null);
    setDrawerOpen(true);
  };

  const openEdit = (e: EarningRow) => {
    setEditing(e.id);
    setForm({
      date: e.date ? e.date.split("T")[0] : todayInput(),
      sourceId: e.sourceId,
      remittance: e.remittance,
      amount: String(e.originalAmount),
      currency: e.currency,
      fxRate: String(e.fxRate),
      fiscalYear: e.fiscalYear,
      notes: e.notes ?? "",
      accountId: NO_ACCOUNT,
    });
    setRateNote(null);
    setError(null);
    setDrawerOpen(true);
  };

  const onDateChange = (date: string) =>
    setForm((f) => ({
      ...f,
      date,
      fiscalYear: date ? fiscalYearOf(new Date(date)) : f.fiscalYear,
    }));

  // Fetch the live BDT rate for a currency and prefill the editable field.
  const fetchRate = useCallback(async (currency: string) => {
    setRateLoading(true);
    setRateNote(null);
    try {
      const res = await financeApi.getFxRate(currency);
      if (res && res.rate > 0) {
        setForm((f) => ({ ...f, fxRate: String(res.rate) }));
        setRateNote(
          res.source === "live" || res.source === "cache"
            ? `Live rate ৳${res.rate} / ${currency}${res.asOf ? ` (as of ${fmtDate(res.asOf)})` : ""}`
            : null
        );
      } else {
        setRateNote("Couldn't fetch a rate — enter it manually.");
      }
    } catch {
      setRateNote("Couldn't fetch a rate — enter it manually.");
    } finally {
      setRateLoading(false);
    }
  }, []);

  const onCurrencyChange = (currency: string) => {
    if (currency === "BDT") {
      setForm((f) => ({ ...f, currency, fxRate: "1" }));
      setRateNote(null);
      return;
    }
    setForm((f) => ({ ...f, currency }));
    fetchRate(currency);
  };

  // BDT-equivalent preview from the current form (originalAmount × rate).
  const previewBdt = (() => {
    const amt = parseFloat(form.amount);
    const rate = parseFloat(form.fxRate);
    if (!Number.isFinite(amt) || !Number.isFinite(rate)) return null;
    return amt * rate;
  })();
  const rateMissing = form.currency !== "BDT" && !(parseFloat(form.fxRate) > 0);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const isBdt = form.currency === "BDT";
      const body = {
        date: form.date,
        sourceId: form.sourceId,
        remittance: form.remittance,
        currency: form.currency,
        originalAmount: parseFloat(form.amount),
        fxRate: isBdt ? 1 : parseFloat(form.fxRate),
        fiscalYear: form.fiscalYear,
        notes: form.notes || null,
      };
      if (editing) await financeApi.updateEarning(editing, body);
      // accountId is create-only (opt-in link; no back-sync on edit).
      else await financeApi.createEarning({ ...body, accountId: form.accountId || undefined });
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
    saving,
    error,
    rateLoading,
    rateNote,
    openAdd,
    openEdit,
    onDateChange,
    onCurrencyChange,
    previewBdt,
    rateMissing,
    save,
  };
}
