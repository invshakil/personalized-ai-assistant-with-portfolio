import { useState, useEffect, useCallback } from "react";
import { financeApi, type PaymentFilters as PaymentApiFilters } from "@/lib/api/finance";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";
import type { PaymentRow, EmployeeRow, SourceRow } from "../../types";
import { currentFiscalYear } from "../../format";

export function usePaymentData(buildApiFilters: () => PaymentApiFilters) {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [clients, setClients] = useState<SourceRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  // Full fiscal-year set for the dropdown — derived from an unfiltered list.
  const [allFiscalYears, setAllFiscalYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setPayments((await financeApi.listPayments(buildApiFilters())) ?? []);
    } finally {
      setLoading(false);
    }
  }, [buildApiFilters]);

  const loadRefData = useCallback(async () => {
    const [employeesData, clientsData, accountsData, allPayments] = await Promise.all([
      financeApi.listEmployees(),
      financeApi.listClients(),
      moneyApi.listAccounts(),
      financeApi.listPayments(),
    ]);
    setEmployees(employeesData ?? []);
    setClients(clientsData ?? []);
    setAccounts(accountsData ?? []);
    setAllFiscalYears(
      Array.from(new Set([currentFiscalYear(), ...(allPayments ?? []).map((p) => p.fiscalYear)]))
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

  const total = payments.reduce((s, p) => s + p.amount, 0);

  const reload = useCallback(async () => {
    await load();
    await loadRefData();
  }, [load, loadRefData]);

  return { payments, employees, clients, accounts, allFiscalYears, loading, total, reload };
}
