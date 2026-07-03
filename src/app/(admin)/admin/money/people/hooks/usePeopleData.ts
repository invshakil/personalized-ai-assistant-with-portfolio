import { useCallback, useEffect, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { BeneficiaryRow, MoneyAccountRow } from "@/types";

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

/** Loads the people list + accounts, exposes summary totals, and owns delete. */
export function usePeopleData(openConfirm: OpenConfirm, onError: (message: string) => void) {
  const [people, setPeople] = useState<BeneficiaryRow[]>([]);
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ppl, acc] = await Promise.all([moneyApi.listBeneficiaries(), moneyApi.listAccounts()]);
      setPeople(ppl ?? []);
      setAccounts(acc ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalOwedByMe = people.reduce((s, b) => s + b.outstandingByMe, 0);
  const totalOwedToMe = people.reduce((s, b) => s + b.outstandingToMe, 0);

  function deletePerson(person: BeneficiaryRow) {
    openConfirm(
      "Delete person",
      `Delete "${person.name}"? This cannot be undone.`,
      async () => {
        try {
          const res = await moneyApi.deleteBeneficiary(person.id);
          if (res && res.deleted === false) {
            onError(res.error ?? "Cannot delete this person.");
            return;
          }
          await load();
        } catch (e: unknown) {
          onError(e instanceof Error ? e.message : "Failed to delete");
        }
      },
      { confirmLabel: "Delete" }
    );
  }

  return {
    people,
    accounts,
    loading,
    totalOwedByMe,
    totalOwedToMe,
    reload: load,
    deletePerson,
  };
}
