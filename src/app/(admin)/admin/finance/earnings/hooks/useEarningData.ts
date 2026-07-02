import { useCallback, useEffect, useState } from "react";
import { financeApi, type EarningFilters } from "@/lib/api/finance";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import type { EarningRow, SourceRow } from "../../types";
import { currentFiscalYear } from "../../format";

interface Filters {
  fyFilter: string[];
  sourceFilter: string[];
  hasCustomRange: boolean;
  from?: string;
  to?: string;
  period?: string;
  q: string;
}

export function useEarningData({
  fyFilter,
  sourceFilter,
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: EarningFilters = {
        fiscalYears: fyFilter,
        sourceIds: sourceFilter,
        ...(hasCustomRange ? { from, to } : { period: period ?? "this_month" }),
        ...(q && { q }),
      };
      setEarnings((await financeApi.listEarnings(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [fyFilter, sourceFilter, hasCustomRange, from, to, period, q]);

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
    reload: load,
    reloadRefData: loadRefData,
  };
}
