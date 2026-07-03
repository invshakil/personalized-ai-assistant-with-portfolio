import { useCallback, useEffect, useMemo, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow, MoneyEntryRow } from "@/types";

/** Owns the account list, per-currency summary totals, and the inline
 * "recent transactions" expand/collapse state (fetched on demand & cached). */
export function useAccountsData() {
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [txByAccount, setTxByAccount] = useState<Record<string, MoneyEntryRow[]>>({});
  const [txLoading, setTxLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAccounts((await moneyApi.listAccounts()) ?? []);
      // Balances may have changed — drop cached rows and collapse.
      setExpandedId(null);
      setTxByAccount({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleExpand = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(id);
      if (!txByAccount[id]) {
        setTxLoading(id);
        try {
          const rows =
            (await moneyApi.listEntries({
              accountIds: [id],
              limit: 10,
              sortBy: "date",
              sortDir: "desc",
            })) ?? [];
          setTxByAccount((m) => ({ ...m, [id]: rows }));
        } finally {
          setTxLoading(null);
        }
      }
    },
    [expandedId, txByAccount]
  );

  // Cash position & card debt are per-currency (you can't sum BDT + USD directly;
  // the BDT-converted grand total lives on the Money dashboard).
  const { cashRows, cardDebtRows } = useMemo(() => {
    const cashByCurrency = new Map<string, number>();
    const cardDebtByCurrency = new Map<string, number>();
    for (const a of accounts) {
      if (a.type === "CREDIT_CARD") {
        const debt = Math.max(0, -a.balance);
        if (debt > 0)
          cardDebtByCurrency.set(a.currency, (cardDebtByCurrency.get(a.currency) ?? 0) + debt);
      } else {
        cashByCurrency.set(a.currency, (cashByCurrency.get(a.currency) ?? 0) + a.balance);
      }
    }
    return {
      cashRows: [...cashByCurrency.entries()],
      cardDebtRows: [...cardDebtByCurrency.entries()],
    };
  }, [accounts]);

  return {
    accounts,
    loading,
    load,
    expandedId,
    toggleExpand,
    txByAccount,
    txLoading,
    cashRows,
    cardDebtRows,
  };
}
