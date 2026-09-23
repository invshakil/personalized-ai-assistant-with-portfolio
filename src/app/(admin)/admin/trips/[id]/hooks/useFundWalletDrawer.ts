import { useCallback, useState } from "react";
import { tripsApi } from "@/lib/api/trips";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import { pairValidValues, rememberAccountPair, seedAccountPair } from "@/lib/accountPicker";
import { todayInput } from "../../format";

interface FundForm {
  fromAccountTypeId: string; // filter only — never sent
  fromAccountId: string;
  amount: string;
  toAmount: string;
  date: string;
  notes: string;
}

const BLANK: FundForm = {
  fromAccountTypeId: "",
  fromAccountId: "",
  amount: "",
  toAmount: "",
  date: todayInput(),
  notes: "",
};

/** Convert money from a home account into the trip's local-currency wallet. */
export function useFundWalletDrawer(
  tripId: string,
  walletAccountId: string | null,
  localCurrency: string,
  accounts: MoneyAccountRow[],
  reload: () => Promise<void>
) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FundForm>(BLANK);
  const [rateNote, setRateNote] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const defaults = useFormDefaults("trips.fundWallet");

  const openDrawer = useCallback(() => {
    // The wallet can't fund itself, so it is never a valid default source.
    const notWallet = (a: MoneyAccountRow) => a.id !== walletAccountId;
    const pair = seedAccountPair(
      accounts,
      defaults.seed(pairValidValues(accounts, { filter: notWallet })),
      { filter: notWallet }
    );
    setForm({ ...BLANK, fromAccountTypeId: pair.typeId, fromAccountId: pair.accountId });
    setRateNote(null);
    setError(null);
    setOpen(true);
  }, [accounts, defaults, walletAccountId]);

  const close = useCallback(() => setOpen(false), []);

  /** Prefill the destination amount from the live rate (editable afterwards). */
  const prefillRate = useCallback(async () => {
    const amt = Number(form.amount);
    if (!form.fromAccountId || !amt) {
      setRateNote("Pick a source account and enter an amount first.");
      return;
    }
    const srcCur = accounts.find((a) => a.id === form.fromAccountId)?.currency ?? "BDT";
    const [rl, rs] = await Promise.all([
      localCurrency === "BDT" ? Promise.resolve({ rate: 1 }) : moneyApi.getFxRate(localCurrency),
      srcCur === "BDT" ? Promise.resolve({ rate: 1 }) : moneyApi.getFxRate(srcCur),
    ]);
    const rateL = rl?.rate || 0;
    const rateS = rs?.rate || 1;
    if (rateL > 0) {
      const local = (amt * rateS) / rateL;
      setForm((f) => ({ ...f, toAmount: String(Math.round(local * 100) / 100) }));
      setRateNote(`Live: 1 ${localCurrency} ≈ ${(rateL / rateS).toFixed(4)} ${srcCur} — editable.`);
    } else {
      setRateNote("Live rate unavailable — enter the received amount manually.");
    }
  }, [form.amount, form.fromAccountId, accounts, localCurrency]);

  const save = useCallback(async () => {
    if (!walletAccountId) {
      setError("This trip has no wallet account set.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await tripsApi.fundWallet(tripId, {
        fromAccountId: form.fromAccountId,
        toAccountId: walletAccountId,
        amount: Number(form.amount),
        toAmount: Number(form.toAmount),
        date: form.date,
        notes: form.notes || null,
      });
      defaults.remember(
        rememberAccountPair({ typeId: form.fromAccountTypeId, accountId: form.fromAccountId })
      );
      setOpen(false);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fund wallet");
    } finally {
      setSaving(false);
    }
  }, [walletAccountId, tripId, form, reload, defaults]);

  return { open, form, setForm, rateNote, saving, error, openDrawer, close, prefillRate, save };
}
