import { useCallback, useEffect, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { SourceRow } from "../../types";

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

export function useSourcesSection(openConfirm: OpenConfirm, onError: (message: string) => void) {
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await financeApi.listClients();
      setSources(s ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function deleteSource(id: string) {
    openConfirm(
      "Delete source",
      "This is only possible if nothing references it yet. This cannot be undone.",
      async () => {
        try {
          await financeApi.deleteClient(id);
          await load();
        } catch (e) {
          onError(e instanceof Error ? e.message : "Cannot delete — it is still referenced.");
        }
      },
      { confirmLabel: "Delete" }
    );
  }

  return { sources, loading, reload: load, deleteSource };
}
