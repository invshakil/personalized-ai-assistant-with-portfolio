import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import type { LogPage } from "@/types";
import { PAGE_SIZE } from "../types";
import type { useLogFilters } from "./useLogFilters";

type Filters = ReturnType<typeof useLogFilters>;

export function useLogData(f: Filters) {
  const [data, setData] = useState<LogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { level, source, period, from, to, q, sortBy, sortDir, page } = f;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(
        await adminApi.listLogs({
          level,
          source,
          period,
          from,
          to,
          q,
          sortBy,
          sortDir,
          page,
          pageSize: PAGE_SIZE,
        })
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [level, source, period, from, to, q, sortBy, sortDir, page]);

  useEffect(() => {
    load();
  }, [load]);

  const purge = useCallback(
    async (days: number) => {
      await adminApi.purgeLogs(days);
      await load();
    },
    [load]
  );

  return { data, loading, error, reload: load, purge };
}
