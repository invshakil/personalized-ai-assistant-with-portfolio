import { useState, useEffect } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";

/** Money-Manager accounts for the optional "add to wallet" link on cash/bank receipts. */
export function useMoneyAccounts() {
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);

  useEffect(() => {
    moneyApi.listAccounts().then((a) => setAccounts(a ?? []));
  }, []);

  return accounts;
}
