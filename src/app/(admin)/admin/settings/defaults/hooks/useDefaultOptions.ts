import { useEffect, useMemo, useState } from "react";
import { moneyApi } from "@/lib/api/money";
import { DEFAULTABLE_FIELDS, type OptionSource } from "@/lib/formDefaults/registry";
import type { SelectOption } from "@/components/admin/SearchableSelect";

/** Shown as an explicit option so "no default" is a choice, not an empty box. */
export const NO_DEFAULT = "__none__";

type OptionMap = Partial<Record<OptionSource, SelectOption[]>>;

/**
 * Loads the option lists the registry actually references.
 *
 * Only the sources in use are fetched, so registering a Property field later
 * costs one branch here rather than a page-wide refactor. `enum` sources carry
 * their own options on the registry entry and never come from the network.
 */
export function useDefaultOptions() {
  const [options, setOptions] = useState<OptionMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const needed = useMemo(
    () => new Set(DEFAULTABLE_FIELDS.map((f) => f.source).filter((s) => s !== "enum")),
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next: OptionMap = {};
        if (needed.has("moneyAccounts")) {
          const rows = (await moneyApi.listAccounts()) ?? [];
          next.moneyAccounts = rows.map((a) => ({
            value: a.id,
            label: a.currency && a.currency !== "BDT" ? `${a.name} (${a.currency})` : a.name,
          }));
        }
        if (needed.has("moneyCategories")) {
          const rows = (await moneyApi.listCategories()) ?? [];
          next.moneyCategories = rows.map((c) => ({
            value: c.id,
            label: `${c.name} · ${c.kind === "INCOME" ? "income" : "expense"}`,
          }));
        }
        if (!cancelled) setOptions(next);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load options");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [needed]);

  return { options, loading, error };
}
