import { useCallback, useEffect, useMemo, useState } from "react";
import { moneyApi, type EntryFilters } from "@/lib/api/money";
import type { MoneyAccountRow, MoneyCategoryRow, MoneyEntryRow, BeneficiaryRow } from "@/types";
import { DEFAULT_PERIOD, type DirFilter, type SortBy, type SortDir } from "../types";

interface Filters {
  hasCustomRange: boolean;
  from?: string;
  to?: string;
  period?: string;
  dirFilter: DirFilter;
  categoryFilter: string[];
  accountFilter: string[];
  currencyFilter: string[];
  q: string;
  sortBy: SortBy;
  sortDir: SortDir;
}

/** Fetches ledger entries (filtered) plus reference data (accounts/categories/beneficiaries). */
export function useEntryData(filters: Filters) {
  const {
    hasCustomRange,
    from,
    to,
    period,
    dirFilter,
    categoryFilter,
    accountFilter,
    currencyFilter,
    q,
    sortBy,
    sortDir,
  } = filters;

  const [entries, setEntries] = useState<MoneyEntryRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [categories, setCategories] = useState<MoneyCategoryRow[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const f: EntryFilters = {
        ...(hasCustomRange ? { from, to } : { period: period ?? DEFAULT_PERIOD }),
        ...(dirFilter !== "ALL" && { direction: dirFilter }),
        ...(categoryFilter.length && { categoryIds: categoryFilter }),
        ...(accountFilter.length && { accountIds: accountFilter }),
        ...(currencyFilter.length && { currencies: currencyFilter }),
        ...(q && { q }),
        sortBy,
        sortDir,
      };
      setEntries((await moneyApi.listEntries(f)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [
    hasCustomRange,
    from,
    to,
    period,
    dirFilter,
    categoryFilter,
    accountFilter,
    currencyFilter,
    q,
    sortBy,
    sortDir,
  ]);

  const loadRefData = useCallback(async () => {
    const [acc, cat, ppl] = await Promise.all([
      moneyApi.listAccounts(),
      moneyApi.listCategories(),
      moneyApi.listBeneficiaries(),
    ]);
    setAccounts(acc ?? []);
    setCategories(cat ?? []);
    setBeneficiaries(ppl ?? []);
  }, []);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);
  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const accountName = useCallback(
    (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "—",
    [accounts]
  );

  // Totals for the currently-filtered set, split BY CURRENCY (can't add $ to ৳).
  // The list is unpaged, so these are exact.
  const totalsByCurrency = useMemo(() => {
    const m = new Map<string, { income: number; expense: number }>();
    for (const e of entries) {
      if (e.direction === "TRANSFER") continue; // excluded from income/expense
      const c = m.get(e.currency) ?? { income: 0, expense: 0 };
      if (e.direction === "CREDIT") c.income += e.amount;
      else c.expense += e.amount;
      m.set(e.currency, c);
    }
    // BDT first, then others alphabetically.
    return [...m.entries()]
      .map(([currency, v]) => ({ currency, ...v, net: v.income - v.expense }))
      .sort((a, b) =>
        a.currency === "BDT" ? -1 : b.currency === "BDT" ? 1 : a.currency.localeCompare(b.currency)
      );
  }, [entries]);

  return {
    entries,
    accounts,
    categories,
    beneficiaries,
    loading,
    accountName,
    totalsByCurrency,
    reload: loadEntries,
    reloadRefData: loadRefData,
  };
}
