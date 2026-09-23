import { useCallback, useState, type Dispatch, type SetStateAction } from "react";
import { moneyApi } from "@/lib/api/money";
import type { AccountSelection } from "@/lib/accountPicker";
import type { MoneyAccountRow } from "@/types";
import type { TripExpenseForm } from "./expenseForm";

/**
 * How a trip expense was paid, and in what currency. A self payer picks the
 * funding account and inherits its currency; a friend-paid expense picks the
 * currency directly. Either way the live FX rate is prefilled (editable).
 */
export function useExpenseFunding(
  accounts: MoneyAccountRow[],
  setForm: Dispatch<SetStateAction<TripExpenseForm>>
) {
  const [rateLoading, setRateLoading] = useState(false);

  const prefillRate = useCallback(
    async (cur: string) => {
      if (cur === "BDT") {
        setForm((f) => ({ ...f, fxRate: "" }));
        return;
      }
      setRateLoading(true);
      try {
        const r = await moneyApi.getFxRate(cur);
        if (r?.rate) setForm((f) => ({ ...f, fxRate: String(r.rate) }));
      } finally {
        setRateLoading(false);
      }
    },
    [setForm]
  );

  /** Self path: pick the funding account and inherit its currency + live rate. */
  const setAccount = useCallback(
    async (sel: AccountSelection) => {
      if (!sel.accountId) {
        setForm((f) => ({ ...f, accountTypeId: sel.typeId, accountId: "" }));
        return;
      }
      const cur = accounts.find((a) => a.id === sel.accountId)?.currency ?? "BDT";
      setForm((f) => ({
        ...f,
        accountTypeId: sel.typeId,
        accountId: sel.accountId,
        currency: cur,
      }));
      await prefillRate(cur);
    },
    [accounts, prefillRate, setForm]
  );

  /** Friend path: choose the currency the expense was paid in. */
  const setCurrency = useCallback(
    async (cur: string) => {
      setForm((f) => ({ ...f, currency: cur }));
      await prefillRate(cur);
    },
    [prefillRate, setForm]
  );

  return { rateLoading, setAccount, setCurrency };
}
