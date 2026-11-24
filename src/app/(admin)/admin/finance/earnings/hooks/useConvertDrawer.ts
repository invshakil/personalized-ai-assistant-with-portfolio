import { useState } from "react";
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
import {
  conversionCheck,
  convertibleCurrencies,
  pendingByCurrency as groupPending,
} from "../convertForm";
import { useConvertQuote } from "./useConvertQuote";

/** The first selectable account in `pool`, or nothing. */
function firstOf(pool: MoneyAccountRow[]): AccountSelection {
  const [first] = selectableAccounts(pool, "");
  return first ? selectAccount(pool, first.id) : EMPTY_SELECTION;
}

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
  const [convTo, setConvToState] = useState<AccountSelection>(EMPTY_SELECTION);
  const [convDate, setConvDate] = useState(todayInput());
  const {
    toAmount: convToAmount,
    setToAmount: setConvToAmount,
    loading: convRateLoading,
    quote: prefillReceived,
  } = useConvertQuote();
  const [convSaving, setConvSaving] = useState(false);
  const [convError, setConvError] = useState<string | null>(null);

  const pendingByCurrency = groupPending(pendingEarnings, accounts);
  const currencyOptions = convertibleCurrencies(pendingByCurrency, accounts);
  const pendingTotalForCurrency =
    pendingByCurrency.find((p) => p.currency === convCurrency)?.original ?? 0;

  // "" until a destination account is picked — never assume BDT, or an amount
  // quoted for one currency could end up labelled (and saved) as another.
  const currencyOf = (accountId: string) =>
    accounts.find((a) => a.id === accountId)?.currency ?? "";
  const toCurrency = currencyOf(convTo.accountId);
  const convAmountNum = parseFloat(convAmount) || 0;
  const convToAmountNum = parseFloat(convToAmount);
  const convRate = convAmountNum > 0 && convToAmountNum > 0 ? convToAmountNum / convAmountNum : 0;
  // The currency pools each picker draws from; the picker applies the active rules.
  const fromAccountOptions = accounts.filter((a) => a.currency === convCurrency);
  const toAccountOptions = accounts.filter((a) => a.currency !== convCurrency);
  const fromAccountBalance = accounts.find((a) => a.id === convFrom.accountId)?.balance ?? 0;
  const check = conversionCheck({
    amount: convAmountNum,
    balance: fromAccountBalance,
    pendingTotal: pendingTotalForCurrency,
  });
  const convReady =
    convAmountNum > 0 &&
    !!convFrom.accountId &&
    !!convTo.accountId &&
    convToAmountNum > 0 &&
    !check.exceedsBalance;

  // The foreign money can only come from an account holding that currency.
  const firstFrom = (currency: string) => firstOf(accounts.filter((a) => a.currency === currency));

  // `presetEarningId` (from a row's "Convert" action) seeds the amount field
  // with that earning's original amount — still just a starting suggestion,
  // not a locked selection.
  const openConvert = (currency?: string, presetEarningId?: string) => {
    const cur = currency ?? currencyOptions[0] ?? "";
    const preset = presetEarningId
      ? pendingEarnings.find((e) => e.id === presetEarningId)?.originalAmount
      : undefined;
    setConvCurrency(cur);
    setConvFrom(firstFrom(cur));
    // Realizing to BDT is the common case, so the destination starts on a BDT
    // account: a stored default wins; with none, the first BDT bank account.
    const bdt = accounts.filter((a) => a.currency === "BDT");
    const seeded = seedAccountPair(bdt, defaults.seed(pairValidValues(bdt, { prefix: "to" })), {
      prefix: "to",
    });
    const bank = withKindFallback(bdt, seeded, "BANK");
    const dest = bank.accountId || bank.typeId ? bank : firstOf(bdt);
    setConvToState(dest);
    setConvDate(todayInput());
    setConvAmount(preset ? String(preset) : "");
    setConvToAmount("");
    setConvError(null);
    setConvertOpen(true);
    if (preset) prefillReceived(cur, currencyOf(dest.accountId), preset);
  };

  const onConvCurrencyChange = (cur: string) => {
    setConvCurrency(cur);
    setConvFrom(firstFrom(cur));
    // A destination in the new source currency would be a transfer, not a conversion.
    if (toCurrency === cur) setConvToState(EMPTY_SELECTION);
    setConvAmount("");
    setConvToAmount("");
  };

  // The received amount belongs to ONE destination currency. Whenever that
  // changes — another currency, or no account at all — it is cleared, and
  // re-quoted once there is a destination to quote for.
  const setConvTo = (sel: AccountSelection) => {
    setConvToState(sel);
    const next = currencyOf(sel.accountId);
    if (next === toCurrency) return;
    setConvToAmount("");
    prefillReceived(convCurrency, next, convAmountNum);
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
      // Only a BDT destination is remembered: the default seeds from BDT accounts.
      if (toCurrency === "BDT") defaults.remember(rememberAccountPair(convTo, "to"));
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
    onConvAmountBlur: () => prefillReceived(convCurrency, toCurrency, convAmountNum),
    convFrom,
    setConvFrom,
    convTo,
    setConvTo,
    toCurrency,
    convDate,
    setConvDate,
    convToAmount,
    setConvToAmount,
    convSaving,
    convError,
    convRateLoading,
    pendingByCurrency,
    currencyOptions,
    pendingTotalForCurrency,
    convAmountNum,
    convRate,
    convToAmountNum,
    fromAccountOptions,
    toAccountOptions,
    fromAccountBalance,
    exceedsBalance: check.exceedsBalance,
    uncoveredAmount: check.uncovered,
    convReady,
    openConvert,
    onConvCurrencyChange,
    doConvert,
  };
}

/** Everything the Convert drawer's components render from. */
export type ConvertDrawerState = ReturnType<typeof useConvertDrawer>;
