import { useCallback, useEffect, useMemo, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { AccountTypeRow } from "@/types";

/** Owns the account-type list and the "show archived" toggle. */
export function useAccountTypesData() {
  const [types, setTypes] = useState<AccountTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTypes((await moneyApi.listAccountTypes()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => (showArchived ? types : types.filter((t) => t.isActive)),
    [types, showArchived]
  );
  const archivedCount = useMemo(() => types.filter((t) => !t.isActive).length, [types]);

  return { types, visible, archivedCount, loading, load, showArchived, setShowArchived };
}
