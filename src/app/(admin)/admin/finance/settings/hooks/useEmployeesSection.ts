import { useCallback, useEffect, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { EmployeeRow } from "../../types";

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

export function useEmployeesSection(openConfirm: OpenConfirm, onError: (message: string) => void) {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const e = await financeApi.listEmployees();
      setEmployees(e ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function deleteEmployee(id: string) {
    openConfirm(
      "Delete employee",
      "This is only possible if nothing references it yet. This cannot be undone.",
      async () => {
        try {
          await financeApi.deleteEmployee(id);
          await load();
        } catch (e) {
          onError(e instanceof Error ? e.message : "Cannot delete — it is still referenced.");
        }
      },
      { confirmLabel: "Delete" }
    );
  }

  return { employees, loading, reload: load, deleteEmployee };
}
