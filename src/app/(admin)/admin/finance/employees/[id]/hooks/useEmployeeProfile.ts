import { useState, useEffect, useCallback } from "react";
import { financeApi } from "@/lib/api/finance";
import type { EmployeeRow, PaymentRow } from "../../../types";

export function useEmployeeProfile(id: string) {
  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [employeeData, paymentsData] = await Promise.all([
        financeApi.getEmployee(id),
        financeApi.listPayments({ employeeIds: [id] }),
      ]);
      setEmployee(employeeData);
      setPayments(paymentsData ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return { employee, payments, totalPaid, loading, error, reload: load };
}
