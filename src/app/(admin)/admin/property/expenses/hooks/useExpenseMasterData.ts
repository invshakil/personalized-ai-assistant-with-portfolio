import { useState, useEffect } from "react";
import { propertyApi } from "@/lib/api/property";
import { moneyApi } from "@/lib/api/money";
import type { Payee, PropertyServiceType, MoneyAccountRow } from "@/types";

/** Payees, service types, and money accounts — loaded once for filters + the form. */
export function useExpenseMasterData() {
  const [payees, setPayees] = useState<Payee[]>([]);
  const [serviceTypes, setServiceTypes] = useState<PropertyServiceType[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);

  useEffect(() => {
    Promise.all([propertyApi.listPayees(), propertyApi.listServiceTypes()]).then(([p, s]) => {
      setPayees(p ?? []);
      setServiceTypes((s ?? []).filter((t) => t.isActive));
    });
  }, []);

  useEffect(() => {
    moneyApi.listAccounts().then((a) => setAccounts(a ?? []));
  }, []);

  return { payees, serviceTypes, accounts };
}
