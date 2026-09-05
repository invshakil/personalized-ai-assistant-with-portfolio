import { useCallback, useEffect, useMemo, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import type { MoneyCategoryRow } from "@/types";

/** Owns the category list, the loading flag, and the name search box. */
export function useCategoriesData() {
  const [categories, setCategories] = useState<MoneyCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setCategories((await moneyApi.listCategories()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? categories.filter((c) => c.name.toLowerCase().includes(q)) : categories;
  }, [categories, query]);

  return { categories, filtered, loading, load, query, setQuery };
}
