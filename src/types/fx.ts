// Foreign-exchange types — shared across finance + money. Re-exported via @/types.
// `amount`/BDT stays canonical everywhere; these describe the live/cached rate
// used to convert a foreign currency to BDT.

/** Currencies the app can record. BDT is canonical; the rest are foreign. */
export const SUPPORTED_CURRENCIES = ["BDT", "USD", "EUR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Display symbol per currency (UI + PDF). */
export const CURRENCY_SYMBOL: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
};

export interface FxRateResult {
  /** The foreign currency this rate converts to BDT. */
  currency: string;
  /** BDT per 1 unit of `currency` (BDT → 1). 0 means "could not determine". */
  rate: number;
  /** ISO timestamp the feed reported the rate, when known. */
  asOf: string | null;
  /** "live" = freshly fetched; "cache" = recent DB row; "fallback" = identity/unavailable. */
  source: "live" | "cache" | "fallback";
}
