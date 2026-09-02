"use client";

// Loads every stored dropdown default once and shares them across the admin.
//
// Mirrors AdminThemeProvider: the whole table is a few dozen rows, so one fetch
// at mount beats a request per drawer. Forms read through `useFormDefaults`
// (src/hooks/useFormDefaults.ts) rather than touching this context directly.
//
// Loading never blocks a form. If the fetch fails or has not returned yet,
// every default resolves to "nothing chosen" — which is exactly how the drawers
// behaved before this feature existed.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { fieldKey } from "@/lib/formDefaults/registry";
import type { DefaultMode } from "@/lib/formDefaults/registry";
import type { FormDefaultRow } from "@/types";

interface FormDefaultsContextValue {
  /** Stored rows keyed by "scope|field". Empty until the first load resolves. */
  byKey: Map<string, FormDefaultRow>;
  loaded: boolean;
  /** Set or clear one default (value "" clears it) and update the local map. */
  setDefault: (scope: string, field: string, value: string, mode?: DefaultMode) => Promise<void>;
  /** Remove the row entirely, reverting to the registry's starting mode. */
  clearDefault: (scope: string, field: string) => Promise<void>;
  /** Fire-and-forget: record what a form just saved, for "lastUsed" fields. */
  remember: (scope: string, values: Record<string, string>) => void;
  reload: () => Promise<void>;
}

const FormDefaultsContext = createContext<FormDefaultsContextValue | null>(null);

export function useFormDefaultsContext(): FormDefaultsContextValue {
  const ctx = useContext(FormDefaultsContext);
  if (!ctx) throw new Error("useFormDefaultsContext must be used within FormDefaultsProvider");
  return ctx;
}

export default function FormDefaultsProvider({ children }: { children: React.ReactNode }) {
  const [rows, setRows] = useState<FormDefaultRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows((await adminApi.listFormDefaults()) ?? []);
    } catch {
      // A missing defaults table must not break the admin — forms simply open
      // empty, as they did before.
      setRows([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byKey = useMemo(() => new Map(rows.map((r) => [fieldKey(r.scope, r.field), r])), [rows]);

  const setDefault = useCallback(
    async (scope: string, field: string, value: string, mode?: DefaultMode) => {
      const saved = await adminApi.setFormDefault({ scope, field, value, mode });
      setRows((prev) => {
        const rest = prev.filter((r) => !(r.scope === scope && r.field === field));
        return [...rest, saved];
      });
    },
    []
  );

  const clearDefault = useCallback(async (scope: string, field: string) => {
    await adminApi.clearFormDefault(scope, field);
    setRows((prev) => prev.filter((r) => !(r.scope === scope && r.field === field)));
  }, []);

  const remember = useCallback((scope: string, values: Record<string, string>) => {
    // Deliberately not awaited and deliberately silent: the record has already
    // been saved, and failing to remember a convenience default must never
    // surface as an error on a successful save.
    void adminApi
      .rememberFormValues(scope, values)
      .then(() => {
        setRows((prev) => {
          const next = [...prev];
          for (const [field, value] of Object.entries(values)) {
            const i = next.findIndex((r) => r.scope === scope && r.field === field);
            // Only mirror rows already in "lastUsed" mode — the server applies
            // the same rule, and guessing here would show a stale value.
            if (i >= 0 && next[i].mode === "lastUsed" && value) next[i] = { ...next[i], value };
          }
          return next;
        });
      })
      .catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ byKey, loaded, setDefault, clearDefault, remember, reload: load }),
    [byKey, loaded, setDefault, clearDefault, remember, load]
  );

  return <FormDefaultsContext.Provider value={value}>{children}</FormDefaultsContext.Provider>;
}
