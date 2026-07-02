import { useState, useEffect, useCallback } from "react";
import { financeApi, type BizExpenseFilters } from "@/lib/api/finance";
import type { BizExpenseRow } from "../../types";

interface Filters {
  fyFilter: string[];
  categoryFilter: string[];
  hasCustomRange: boolean;
  from?: string;
  to?: string;
  period?: string;
  q: string;
}

export function useExpenseList({
  fyFilter,
  categoryFilter,
  hasCustomRange,
  from,
  to,
  period,
  q,
}: Filters) {
  const [expenses, setExpenses] = useState<BizExpenseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: BizExpenseFilters = {
        fiscalYears: fyFilter,
        categoryIds: categoryFilter,
        ...(hasCustomRange ? { from, to } : { period: period ?? "this_month" }),
        ...(q && { q }),
      };
      setExpenses((await financeApi.listExpenses(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [fyFilter, categoryFilter, hasCustomRange, from, to, period, q]);

  useEffect(() => {
    load();
  }, [load]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return { expenses, loading, total, reload: load };
}
