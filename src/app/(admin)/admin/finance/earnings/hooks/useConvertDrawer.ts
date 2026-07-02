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
  const [convSelected, setConvSelected] = useState<Set<string>>(new Set());
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

  const convList = pendingEarnings.filter((e) => e.currency === convCurrency);
  const convChosen = convList.filter((e) => convSelected.has(e.id));
  const convTotalOriginal = convChosen.reduce((s, e) => s + e.originalAmount, 0);
  const convIndicativeBdt = convChosen.reduce((s, e) => s + e.amount, 0); // earn-time estimate
  const convToAmountNum = parseFloat(convToAmount);
  const convRate =
    convTotalOriginal > 0 && convToAmountNum > 0 ? convToAmountNum / convTotalOriginal : 0;
  const convVariance = convToAmountNum > 0 ? convToAmountNum - convIndicativeBdt : 0;
  const fromAccountOptions = accounts.filter((a) => a.currency === convCurrency);
  const toAccountOptions = accounts.filter((a) => a.currency === "BDT");
  const convReady = convChosen.length > 0 && !!convFrom && !!convTo && parseFloat(convToAmount) > 0;

  // Prefill the BDT-received field from the live rate × selected foreign total.
  const prefillConvAmount = useCallback(async (currency: string, totalOriginal: number) => {
    if (currency === "" || totalOriginal <= 0) return;
    setConvRateLoading(true);
    try {
      const res = await financeApi.getFxRate(currency);
      if (res && res.rate > 0) {
        setConvToAmount(String(Math.round(totalOriginal * res.rate * 100) / 100));
      }
    } catch {
      /* leave blank — user enters the actual amount */
    } finally {
      setConvRateLoading(false);
    }
  }, []);

  const openConvert = (currency?: string, preselectId?: string) => {
    const cur = currency ?? pendingCurrencies[0] ?? "";
    const list = pendingEarnings.filter((e) => e.currency === cur);
    const sel = new Set(preselectId ? [preselectId] : list.map((e) => e.id));
    setConvCurrency(cur);
    setConvSelected(sel);
    setConvFrom(accounts.find((a) => a.currency === cur)?.id ?? "");
    setConvTo(
      accounts.find((a) => a.currency === "BDT" && a.type === "BANK")?.id ??
        accounts.find((a) => a.currency === "BDT")?.id ??
        ""
    );
    setConvDate(todayInput());
    setConvToAmount("");
    setConvError(null);
    setConvertOpen(true);
    const total = list.filter((e) => sel.has(e.id)).reduce((s, e) => s + e.originalAmount, 0);
    prefillConvAmount(cur, total);
  };

  const onConvCurrencyChange = (cur: string) => {
    const list = pendingEarnings.filter((e) => e.currency === cur);
    const sel = new Set(list.map((e) => e.id));
    setConvCurrency(cur);
    setConvSelected(sel);
    setConvFrom(accounts.find((a) => a.currency === cur)?.id ?? "");
    setConvToAmount("");
    prefillConvAmount(
      cur,
      list.reduce((s, e) => s + e.originalAmount, 0)
    );
  };

  const toggleConvSelect = (id: string) => {
    setConvSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const doConvert = async () => {
    setConvSaving(true);
    setConvError(null);
    try {
      await financeApi.convertEarnings({
        earningIds: [...convSelected],
        fromAccountId: convFrom,
        toAccountId: convTo,
        date: convDate,
        toAmount: parseFloat(convToAmount),
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
    convSelected,
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
    convList,
    convChosen,
    convTotalOriginal,
    convRate,
    convVariance,
    convToAmountNum,
    fromAccountOptions,
    toAccountOptions,
    convReady,
    openConvert,
    onConvCurrencyChange,
    toggleConvSelect,
    doConvert,
  };
}
