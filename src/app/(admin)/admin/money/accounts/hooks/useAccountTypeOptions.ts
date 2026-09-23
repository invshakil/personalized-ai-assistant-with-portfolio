import { useCallback, useEffect, useMemo, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { AccountTypeRow } from "@/types";

/**
 * Account types for the account form's Type select. Only active types are
 * offered — plus `keepId`, the type an account being edited already has, so
 * editing an account under an archived type doesn't blank its Type field.
 */
export function useAccountTypeOptions(keepId: string) {
  const [types, setTypes] = useState<AccountTypeRow[]>([]);

  const load = useCallback(async () => {
    setTypes((await moneyApi.listAccountTypes()) ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const options = useMemo(
    () =>
      types
        .filter((t) => t.isActive || t.id === keepId)
        .map((t) => ({ value: t.id, label: t.isActive ? t.name : `${t.name} (archived)` })),
    [types, keepId]
  );

  return { types, options, reload: load };
}
