import { useCallback, useEffect, useMemo, useState } from "react";
import { financeApi, type EarningFilters } from "@/lib/api/finance";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import type { EarningRow, SourceRow } from "../../types";
import type { TypeFilter } from "../types";
import { currentFiscalYear } from "../../format";

interface Filters {
  fyFilter: string[];
  sourceFilter: string[];
  typeFilter: TypeFilter;
  hasCustomRange: boolean;
  from?: string;
  to?: string;
  period?: string;
  q: string;
}

export function useEarningData({
  fyFilter,
  sourceFilter,
  typeFilter,
  hasCustomRange,
  from,
  to,
  period,
  q,
}: Filters) {
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  // Full fiscal-year set for the dropdown — derived from an unfiltered list so
  // the option set doesn't shrink as the user narrows the table.
  const [allFiscalYears, setAllFiscalYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  // All-time pending foreign earnings (for the convert flow + summary), independent of filters.
  const [pendingEarnings, setPendingEarnings] = useState<EarningRow[]>([]);

  // The API query for the current filters — also what an export downloads, so
  // the file always matches the table.
  const activeFilters = useMemo<EarningFilters>(
    () => ({
      fiscalYears: fyFilter,
      sourceIds: sourceFilter,
      ...(typeFilter !== "ALL" && { remittance: typeFilter }),
      ...(hasCustomRange ? { from, to } : { period: period ?? "this_month" }),
      ...(q && { q }),
    }),
    [fyFilter, sourceFilter, typeFilter, hasCustomRange, from, to, period, q]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEarnings((await financeApi.listEarnings(activeFilters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [activeFilters]);

  const loadRefData = useCallback(async () => {
    const [clientsData, accountsData, allEarnings] = await Promise.all([
      financeApi.listClients(),
      moneyApi.listAccounts(),
      financeApi.listEarnings(),
    ]);
    setSources(clientsData ?? []);
    setAccounts(accountsData ?? []);
    setPendingEarnings((allEarnings ?? []).filter((e) => e.pendingConversion));
    setAllFiscalYears(
      Array.from(new Set([currentFiscalYear(), ...(allEarnings ?? []).map((e) => e.fiscalYear)]))
        .sort()
        .reverse()
    );
  }, []);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);
  useEffect(() => {
    load();
  }, [load]);

  return {
    earnings,
    sources,
    accounts,
    allFiscalYears,
    loading,
    pendingEarnings,
    activeFilters,
    reload: load,
    reloadRefData: loadRefData,
  };
}
