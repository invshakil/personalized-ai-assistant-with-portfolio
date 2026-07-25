"use client";

// Shared hook: the dynamic currency list (from the FX feed) for currency
// pickers. Fetched ONCE per session via a module-level cache + in-flight promise,
// so any number of <CurrencySelect /> mounts share a single request.
import { useEffect, useState } from "react";
import { currenciesApi } from "@/lib/api/currencies";
import type { CurrencyOption } from "@/types";

let cache: CurrencyOption[] | null = null;
let inflight: Promise<CurrencyOption[]> | null = null;

function load(): Promise<CurrencyOption[]> {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = currenciesApi
      .list()
      .then((opts) => {
        cache = opts ?? [];
        return cache;
      })
      .catch(() => {
        inflight = null; // allow a retry on the next mount
        return [];
      });
  }
  return inflight;
}

export function useCurrencyOptions(): { options: CurrencyOption[]; loading: boolean } {
  const [options, setOptions] = useState<CurrencyOption[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) {
      setOptions(cache);
      setLoading(false);
      return;
    }
    let active = true;
    load().then((opts) => {
      if (!active) return;
      setOptions(opts);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { options, loading };
}
