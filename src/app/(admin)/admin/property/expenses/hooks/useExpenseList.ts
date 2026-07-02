import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { PropertyExpense } from "@/types";

interface Filters {
  month: number;
  year: number;
  payeeFilter: string[];
  categoryFilter: string[];
  serviceTypeFilter: string[];
  q: string;
}

export function useExpenseList({
  month,
  year,
  payeeFilter,
  categoryFilter,
  serviceTypeFilter,
  q,
}: Filters) {
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        month,
        year,
        ...(payeeFilter.length && { payeeIds: payeeFilter }),
        ...(categoryFilter.length && { categories: categoryFilter }),
        ...(serviceTypeFilter.length && { serviceTypeIds: serviceTypeFilter }),
        ...(q && { q }),
      };
      setExpenses((await propertyApi.listExpenses(filters)) ?? []);
    } finally {
      setLoading(false);
    }
  }, [month, year, payeeFilter, categoryFilter, serviceTypeFilter, q]);

  useEffect(() => {
    load();
  }, [load]);

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  return { expenses, loading, total, reload: load };
}
