import { useCallback, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { MoneyAccountRow } from "@/types";
import { useFormDefaults } from "@/hooks/useFormDefaults";
import {
  EMPTY_SELECTION,
  pairValidValues,
  rememberAccountPair,
  seedAccountPair,
  selectAccount,
  selectableAccounts,
  withKindFallback,
  type AccountSelection,
} from "@/lib/accountPicker";
import type { EarningRow } from "../../types";
import { todayInput } from "../../format";

export function useConvertDrawer(
  accounts: MoneyAccountRow[],
  pendingEarnings: EarningRow[],
  onSuccess: () => Promise<void>
) {
  const [convertOpen, setConvertOpen] = useState(false);
  const [convCurrency, setConvCurrency] = useState("");
  const [convAmount, setConvAmount] = useState("");
  const defaults = useFormDefaults("finance.convert");
  const [convFrom, setConvFrom] = useState<AccountSelection>(EMPTY_SELECTION);
  const [convTo, setConvTo] = useState<AccountSelection>(EMPTY_SELECTION);
  const [convDate, setConvDate] = useState(todayInput());
  const [convToAmount, setConvToAmount] = useState("");
  const [convSaving, setConvSaving] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);
  const [convRateLoading, setConvRateLoading] = useState(false);

  const pendingByCurrency = (() => {
    const m = new Map<string, { original: number; count: number }>();
    for (const e of pendingEarnings) {
      const c = m.get(e.currency) ?? { original: 0, count: 0 };
      c.original += e.originalAmount;
      c.count += 1;
      m.set(e.currency, c);
    }
    // A pending earning's income may have already been partly spent (e.g. an
    // employee payment posted directly against the same account) — surface
    // the real ledger balance alongside the unrealized-income total so the
    // two don't get conflated as "cash on hand."
    return [...m.entries()].map(([currency, v]) => ({
      currency,
      ...v,
      availableBalance: accounts
        .filter((a) => a.currency === currency)
        .reduce((s, a) => s + a.balance, 0),
    }));
  })();
  const pendingCurrencies = pendingByCurrency.map((p) => p.currency);
  const pendingTotalForCurrency =
    pendingByCurrency.find((p) => p.currency === convCurrency)?.original ?? 0;

  const convAmountNum = parseFloat(convAmount) || 0;
  const convToAmountNum = parseFloat(convToAmount);
  const convRate = convAmountNum > 0 && convToAmountNum > 0 ? convToAmountNum / convAmountNum : 0;
  // The currency pools each picker draws from; the picker applies the active rules.
  const fromAccountOptions = accounts.filter((a) => a.currency === convCurrency);
  const toAccountOptions = accounts.filter((a) => a.currency === "BDT");
  const fromAccountBalance = accounts.find((a) => a.id === convFrom.accountId)?.balance ?? 0;
  const exceedsBalance = convAmountNum > fromAccountBalance + 0.01;
  const exceedsPending = convAmountNum > pendingTotalForCurrency + 0.01;
  const convReady =
    convAmountNum > 0 &&
    !!convFrom.accountId &&
    !!convTo.accountId &&
    convToAmountNum > 0 &&
    !exceedsBalance &&
    !exceedsPending;

  // Prefill the BDT-received field from the live rate × the amount to convert.
  const prefillConvAmount = useCallback(async (currency: string, amount: number) => {
    if (currency === "" || amount <= 0) return;
    setConvRateLoading(true);
    try {
      const res = await financeApi.getFxRate(currency);
      if (res && res.rate > 0) {
        setConvToAmount(String(Math.round(amount * res.rate * 100) / 100));
      }
    } catch {
      /* leave blank — user enters the actual amount */
    } finally {
      setConvRateLoading(false);
    }
  }, []);

  /** The first selectable account in `pool`, or nothing. */
  const firstOf = (pool: MoneyAccountRow[]): AccountSelection => {
    const [first] = selectableAccounts(pool, "");
    return first ? selectAccount(pool, first.id) : EMPTY_SELECTION;
  };
  // The foreign money can only come from an account holding that currency.
  const firstFrom = (currency: string) => firstOf(accounts.filter((a) => a.currency === currency));

  // `presetEarningId` (from a row's "Convert" action) seeds the amount field
  // with that earning's original amount — still just a starting suggestion,
  // not a locked selection.
  const openConvert = (currency?: string, presetEarningId?: string) => {
    const cur = currency ?? pendingCurrencies[0] ?? "";
    const preset = presetEarningId
      ? pendingEarnings.find((e) => e.id === presetEarningId)?.originalAmount
      : undefined;
    setConvCurrency(cur);
    setConvFrom(firstFrom(cur));
    // A stored default wins; with none, the first BDT bank account (as before).
    const bdt = accounts.filter((a) => a.currency === "BDT");
    const seeded = seedAccountPair(bdt, defaults.seed(pairValidValues(bdt, { prefix: "to" })), {
      prefix: "to",
    });
    const bank = withKindFallback(bdt, seeded, "BANK");
    setConvTo(bank.accountId || bank.typeId ? bank : firstOf(bdt));
    setConvDate(todayInput());
    setConvAmount(preset ? String(preset) : "");
    setConvToAmount("");
    setConvError(null);
    setConvertOpen(true);
    if (preset) prefillConvAmount(cur, preset);
  };

  const onConvCurrencyChange = (cur: string) => {
    setConvCurrency(cur);
    setConvFrom(firstFrom(cur));
    setConvAmount("");
    setConvToAmount("");
  };

  const onConvAmountBlur = () => {
    prefillConvAmount(convCurrency, convAmountNum);
  };

  const doConvert = async () => {
    setConvSaving(true);
    setConvError(null);
    try {
      await financeApi.convertEarnings({
        currency: convCurrency,
        amount: convAmountNum,
        fromAccountId: convFrom.accountId,
        toAccountId: convTo.accountId,
        date: convDate,
        toAmount: convToAmountNum,
      });
      defaults.remember(rememberAccountPair(convTo, "to"));
      setConvertOpen(false);
      await onSuccess();
    } catch (e: unknown) {
      setConvError(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setConvSaving(false);
    }
  };

  return {
    convertOpen,
    closeConvert: () => setConvertOpen(false),
    convCurrency,
    convAmount,
    setConvAmount,
    onConvAmountBlur,
    convFrom,
    setConvFrom,
    convTo,
    setConvTo,
    convDate,
    setConvDate,
    convToAmount,
    setConvToAmount,
    convSaving,
    convError,
    convRateLoading,
    pendingByCurrency,
    pendingCurrencies,
    pendingTotalForCurrency,
    convAmountNum,
    convRate,
    convToAmountNum,
    fromAccountOptions,
    toAccountOptions,
    fromAccountBalance,
    exceedsBalance,
    exceedsPending,
    convReady,
    openConvert,
    onConvCurrencyChange,
    doConvert,
  };
}
