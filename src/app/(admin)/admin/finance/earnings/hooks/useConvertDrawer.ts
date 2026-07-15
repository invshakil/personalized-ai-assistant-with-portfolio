import { useCallback, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { MoneyAccountRow } from "@/types";
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
  const [convFrom, setConvFrom] = useState("");
  const [convTo, setConvTo] = useState("");
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
    return [...m.entries()].map(([currency, v]) => ({ currency, ...v }));
  })();
  const pendingCurrencies = pendingByCurrency.map((p) => p.currency);
  const pendingTotalForCurrency =
    pendingByCurrency.find((p) => p.currency === convCurrency)?.original ?? 0;

  const convAmountNum = parseFloat(convAmount) || 0;
  const convToAmountNum = parseFloat(convToAmount);
  const convRate = convAmountNum > 0 && convToAmountNum > 0 ? convToAmountNum / convAmountNum : 0;
  const fromAccountOptions = accounts.filter((a) => a.currency === convCurrency);
  const toAccountOptions = accounts.filter((a) => a.currency === "BDT");
  const fromAccountBalance = accounts.find((a) => a.id === convFrom)?.balance ?? 0;
  const exceedsBalance = convAmountNum > fromAccountBalance + 0.01;
  const exceedsPending = convAmountNum > pendingTotalForCurrency + 0.01;
  const convReady =
    convAmountNum > 0 &&
    !!convFrom &&
    !!convTo &&
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

  // `presetEarningId` (from a row's "Convert" action) seeds the amount field
  // with that earning's original amount — still just a starting suggestion,
  // not a locked selection.
  const openConvert = (currency?: string, presetEarningId?: string) => {
    const cur = currency ?? pendingCurrencies[0] ?? "";
    const preset = presetEarningId
      ? pendingEarnings.find((e) => e.id === presetEarningId)?.originalAmount
      : undefined;
    setConvCurrency(cur);
    setConvFrom(accounts.find((a) => a.currency === cur)?.id ?? "");
    setConvTo(
      accounts.find((a) => a.currency === "BDT" && a.type === "BANK")?.id ??
        accounts.find((a) => a.currency === "BDT")?.id ??
        ""
    );
    setConvDate(todayInput());
    setConvAmount(preset ? String(preset) : "");
    setConvToAmount("");
    setConvError(null);
    setConvertOpen(true);
    if (preset) prefillConvAmount(cur, preset);
  };

  const onConvCurrencyChange = (cur: string) => {
    setConvCurrency(cur);
    setConvFrom(accounts.find((a) => a.currency === cur)?.id ?? "");
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
        fromAccountId: convFrom,
        toAccountId: convTo,
        date: convDate,
        toAmount: convToAmountNum,
      });
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
