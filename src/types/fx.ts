// Foreign-exchange types — shared across finance + money. Re-exported via @/types.
// `amount`/BDT stays canonical everywhere; these describe the live/cached rate
// used to convert a foreign currency to BDT.

// Currency selection is DYNAMIC: the full list is fetched from the FX feed at
// runtime (see getSupportedCurrencyCodes / getCurrencyOptions in
// services/_shared/fx.ts) and offered via the searchable <CurrencySelect />.
// The constants below are only a quick-pick / offline fallback — currency values
// are plain `string` everywhere (stored as String in the DB), NOT limited to this
// list. BDT stays canonical; any feed-supported currency can be recorded.

/** Quick-pick / offline fallback currencies. NOT an exhaustive allow-list. */
export const SUPPORTED_CURRENCIES = ["BDT", "USD", "EUR", "MYR"] as const;
export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/** Fast-path display symbols; unknown codes fall back to Intl (see getCurrencySymbol). */
export const CURRENCY_SYMBOL: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  MYR: "RM",
};

/** A selectable currency, as served by GET /api/admin/currencies. */
export interface CurrencyOption {
  code: string; // ISO 4217, e.g. "MYR"
  name: string; // human name, e.g. "Malaysian Ringgit"
  symbol: string; // display symbol, e.g. "RM"
  label: string; // "MYR — Malaysian Ringgit" (for the searchable dropdown)
}

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
