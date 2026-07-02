import { useState, useEffect, useCallback } from "react";
import { propertyApi } from "@/lib/api/property";
import type { Payee, PropertyExpense } from "@/types";

export function usePayeeProfile(id: string) {
  const [payee, setPayee] = useState<Payee | null>(null);
  const [expenses, setExpenses] = useState<PropertyExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [payeeData, expensesData] = await Promise.all([
        propertyApi.getPayee<Payee>(id),
        propertyApi.listExpenses({ payeeIds: [id] }),
      ]);
      setPayee(payeeData);
      setExpenses(expensesData ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPaid = expenses.reduce((s, e) => s + e.amount, 0);

  return { payee, expenses, totalPaid, loading, error, reload: load };
}
