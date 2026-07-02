import { useState, useCallback, useEffect } from "react";
import { financeApi } from "@/lib/api/finance";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import type { CategoryRow } from "../../types";
import { currentFiscalYear } from "../../format";

/** Categories, money accounts, and the full fiscal-year set — shared by filters + the form. */
export function useExpenseMasterData() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  // Full fiscal-year set for the dropdown — derived from an unfiltered list.
  const [allFiscalYears, setAllFiscalYears] = useState<string[]>([]);

  const load = useCallback(async () => {
    const [categoriesData, accountsData, allExpenses] = await Promise.all([
      financeApi.listCategories(),
      moneyApi.listAccounts(),
      financeApi.listExpenses(),
    ]);
    setCategories(categoriesData ?? []);
    setAccounts(accountsData ?? []);
    setAllFiscalYears(
      Array.from(new Set([currentFiscalYear(), ...(allExpenses ?? []).map((e) => e.fiscalYear)]))
        .sort()
        .reverse()
    );
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { categories, accounts, allFiscalYears, reload: load };
}
