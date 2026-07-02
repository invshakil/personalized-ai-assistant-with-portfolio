import { useCallback, useEffect, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import type { CategoryRow } from "../../types";

type OpenConfirm = (
  title: string,
  message: string,
  onConfirm: () => Promise<void>,
  opts?: { confirmLabel?: string; confirmColor?: "error" | "warning" | "success" | "primary" }
) => void;

export function useCategoriesSection(openConfirm: OpenConfirm, onError: (message: string) => void) {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const c = await financeApi.listCategories();
      setCategories(c ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function deleteCategory(id: string) {
    openConfirm(
      "Delete category",
      "This is only possible if nothing references it yet. This cannot be undone.",
      async () => {
        try {
          await financeApi.deleteCategory(id);
          await load();
        } catch (e) {
          onError(e instanceof Error ? e.message : "Cannot delete — it is still referenced.");
        }
      },
      { confirmLabel: "Delete" }
    );
  }

  return { categories, loading, reload: load, deleteCategory };
}
