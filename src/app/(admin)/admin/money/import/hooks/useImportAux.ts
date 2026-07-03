import { useCallback, useEffect, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { ImportBatchRow } from "@/lib/api/money";
import type { MoneyAccountRow } from "@/types";

/** Loads reference data for the import wizard: the account list (for default-account
 * mapping) and the history of past import batches. */
export function useImportAux() {
  const [accounts, setAccounts] = useState<MoneyAccountRow[]>([]);
  const [batches, setBatches] = useState<ImportBatchRow[]>([]);

  const reload = useCallback(async () => {
    const [acc, b] = await Promise.all([moneyApi.listAccounts(), moneyApi.listImportBatches()]);
    setAccounts(acc ?? []);
    setBatches(b ?? []);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { accounts, batches, reload };
}
