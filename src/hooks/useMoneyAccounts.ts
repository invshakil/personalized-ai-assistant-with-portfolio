"use client";

// Shared hook: the money accounts list (with live balances) for account pickers.
// Exposes `reload` so callers can refresh balances after a mutation.
import { useCallback, useEffect, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";

export function useMoneyAccounts() {
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts((await moneyApi.listAccounts()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { accounts, loading, reload };
}
