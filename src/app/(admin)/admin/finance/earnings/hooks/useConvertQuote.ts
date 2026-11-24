import { useCallback, useRef, useState } from "react";
import { financeApi } from "@/lib/api/finance";
import { crossRate } from "../convertForm";

/** BDT per 1 unit of `currency` (1 for BDT itself; 0 when the feed has nothing). */
async function bdtRate(currency: string): Promise<number> {
  if (currency === "BDT") return 1;
  const res = await financeApi.getFxRate(currency);
  return res && res.rate > 0 ? res.rate : 0;
}

/**
 * The "amount received" field of a conversion, prefilled from the live cross
 * rate. It is only ever a suggestion — the user overwrites it with what the
 * bank actually credited.
 *
 * Quotes are async and can overlap (EUR→USD needs two lookups, EUR→BDT one), so
 * each carries a sequence number and only the latest may write. Typing in the
 * field, or clearing it, also retires whatever is still in flight: a late quote
 * must never replace what the user entered, or land under a different currency.
 */
export function useConvertQuote() {
  const [toAmount, setToAmountState] = useState("");
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  /** Set the field by hand (or clear it with ""), cancelling any pending quote. */
  const setToAmount = useCallback((value: string) => {
    seq.current += 1;
    setLoading(false);
    setToAmountState(value);
  }, []);

  const quote = useCallback(async (from: string, to: string, amount: number) => {
    if (from === "" || to === "" || amount <= 0) return;
    const mine = ++seq.current;
    setLoading(true);
    try {
      const rate = crossRate(await bdtRate(from), await bdtRate(to));
      if (mine === seq.current && rate > 0) {
        setToAmountState(String(Math.round(amount * rate * 100) / 100));
      }
    } catch {
      /* leave blank — the user enters the actual amount */
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  return { toAmount, setToAmount, loading, quote };
}
