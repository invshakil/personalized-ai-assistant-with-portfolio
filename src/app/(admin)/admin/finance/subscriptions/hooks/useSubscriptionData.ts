import { useState, useEffect, useCallback } from "react";
import { financeApi, type SubscriptionFilters } from "@/lib/api/finance";
import type { SubscriptionRow, CategoryRow } from "../../types";

export function useSubscriptionData(categoryFilter: string[], q: string) {
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  // Active monthly run-rate is computed from ALL active subs (not the filtered
  // table), so the headline stat stays accurate while filters narrow the list.
  const [activeMonthly, setActiveMonthly] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: SubscriptionFilters = {
        categoryIds: categoryFilter,
        ...(q && { q }),
      };
      setSubs((await financeApi.listSubscriptions(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, q]);

  // Categories + the unfiltered run-rate — refreshed on mutations, not on filter changes.
  const loadRefData = useCallback(async () => {
    const [categoriesData, allSubs] = await Promise.all([
      financeApi.listCategories(),
      financeApi.listSubscriptions(),
    ]);
    setCategories(categoriesData ?? []);
    setActiveMonthly(
      (allSubs ?? []).filter((s) => s.isActive).reduce((sum, s) => sum + s.currentMonthlyAmount, 0)
    );
  }, []);

  useEffect(() => {
    loadRefData();
  }, [loadRefData]);
  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(async () => {
    await Promise.all([load(), loadRefData()]);
  }, [load, loadRefData]);

  return { subs, categories, activeMonthly, loading, load, loadRefData, reload };
}
