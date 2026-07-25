// Shared FX utility — fetches/caches the BDT conversion rate for a foreign
// currency. Used by the Financial Tracker (per-transaction rate prefill) and the
// Money Manager (valuing foreign account balances on the dashboard).
//
// Source: open.er-api.com (free, no key, supports BDT). We query the FOREIGN
// currency as the base and read `rates.BDT`, which is BDT-per-1-unit directly —
// no inversion. Result is cached in the FxRate table (current-rate cache + so we
// don't hammer the feed). Per-transaction historical rates are stored on the row
// (Earning/EmployeePayment/MoneyEntry.fxRate), separate from this cache.
//
// Never throws and never blocks a transaction: on any failure it returns the most
// recent cached rate, or { rate: 0, source: "fallback" } so the caller can ask the
// user to type the rate manually.
import { db } from "@/lib/db";
import {
  CURRENCY_SYMBOL,
  SUPPORTED_CURRENCIES,
  type CurrencyOption,
  type FxRateResult,
} from "@/types";

const API_BASE = "https://open.er-api.com/v6/latest";
const FETCH_TIMEOUT_MS = 4000;
// Reuse a cached rate this fresh before re-fetching (the feed updates ~daily).
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

// A currency code is any 3-letter ISO 4217 code; the feed itself is the real
// validator (an unknown code just yields no rate → fallback 0). We no longer
// gate on a hardcoded allow-list — currencies are dynamic (see below).
export function isSupportedCurrency(c: string): boolean {
  return /^[A-Z]{3}$/.test(c);
}

interface LiveRate {
  rate: number;
  asOf: Date;
}

async function fetchLive(currency: string): Promise<LiveRate | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(currency)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_unix?: number;
    };
    if (json.result !== "success") return null;
    const rate = json.rates?.BDT;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return null;
    const unix = json.time_last_update_unix;
    const asOf = typeof unix === "number" ? new Date(unix * 1000) : new Date();
    return { rate, asOf };
  } catch {
    return null; // network error / timeout / bad JSON — fall back to cache
  } finally {
    clearTimeout(timer);
  }
}

async function readCache(currency: string) {
  return db.fxRate.findFirst({
    where: { base: "BDT", quote: currency },
    orderBy: { fetchedAt: "desc" },
  });
}

async function writeCache(currency: string, live: LiveRate) {
  await db.fxRate.upsert({
    where: { base_quote_asOf: { base: "BDT", quote: currency, asOf: live.asOf } },
    create: {
      base: "BDT",
      quote: currency,
      rate: live.rate,
      asOf: live.asOf,
      source: "open.er-api.com",
    },
    update: { rate: live.rate, fetchedAt: new Date(), source: "open.er-api.com" },
  });
}

/**
 * Resolve the BDT-per-1-unit rate for `currency`, preferring a fresh cache, then
 * a live fetch (cached on success), then a stale cache. BDT → identity. Never
 * throws; rate 0 signals "unavailable — let the user type it".
 */
export async function getFxRateToBdt(currency: string): Promise<FxRateResult> {
  const code = currency?.toUpperCase?.() ?? "";
  if (code === "BDT") return { currency: "BDT", rate: 1, asOf: null, source: "fallback" };
  if (!isSupportedCurrency(code)) {
    // Not a well-formed 3-letter code — don't bother the feed.
    return { currency: code, rate: 0, asOf: null, source: "fallback" };
  }

  const cached = await readCache(code);
  if (cached && Date.now() - cached.fetchedAt.getTime() < CACHE_TTL_MS) {
    return {
      currency: code,
      rate: Number(cached.rate),
      asOf: cached.asOf.toISOString(),
      source: "cache",
    };
  }

  const live = await fetchLive(code);
  if (live) {
    await writeCache(code, live);
    return { currency: code, rate: live.rate, asOf: live.asOf.toISOString(), source: "live" };
  }

  if (cached) {
    return {
      currency: code,
      rate: Number(cached.rate),
      asOf: cached.asOf.toISOString(),
      source: "cache",
    };
  }
  return { currency: code, rate: 0, asOf: null, source: "fallback" };
}

/**
 * Latest BDT rates for a set of currencies, for valuing foreign balances. Returns
 * a map currency → { rate, asOf } (BDT is always rate 1). Triggers a refresh per
 * currency via getFxRateToBdt; a currency with no obtainable rate is omitted so
 * the caller can flag it rather than silently valuing at 0.
 */
export async function getLatestRatesToBdt(
  currencies: string[]
): Promise<Map<string, { rate: number; asOf: string | null }>> {
  const unique = Array.from(new Set(currencies.map((c) => c.toUpperCase())));
  const out = new Map<string, { rate: number; asOf: string | null }>();
  for (const code of unique) {
    if (code === "BDT") {
      out.set("BDT", { rate: 1, asOf: null });
      continue;
    }
    const r = await getFxRateToBdt(code);
    if (r.rate > 0) out.set(code, { rate: r.rate, asOf: r.asOf });
  }
  return out;
}

// ─── Dynamic currency list ─────────────────────────────────────────────────────
// The set of selectable currencies is not hardcoded — it comes from the FX feed
// (the keys of its rate table). Cached in-module for 12h; a built-in fallback
// keeps currency pickers working if the feed is briefly unreachable.

/** Sensible offline fallback if the feed can't be reached on a cold start. */
const FALLBACK_CODES = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "MYR",
  "SGD",
  "AED",
  "SAR",
  "INR",
  "THB",
  "JPY",
  "CNY",
  "AUD",
  "CAD",
  "CHF",
  "HKD",
  "IDR",
  "PHP",
  "PKR",
  "LKR",
  "NPR",
  "QAR",
];

let codeCache: { codes: string[]; at: number } | null = null;

/** All currency codes the app can record, fetched from the FX feed (BDT first). */
export async function getSupportedCurrencyCodes(): Promise<string[]> {
  if (codeCache && Date.now() - codeCache.at < CACHE_TTL_MS) return codeCache.codes;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE}/BDT`, { signal: controller.signal });
    if (res.ok) {
      const json = (await res.json()) as { result?: string; rates?: Record<string, number> };
      if (json.result === "success" && json.rates) {
        const codes = Object.keys(json.rates).filter((c) => /^[A-Z]{3}$/.test(c));
        if (codes.length) {
          if (!codes.includes("BDT")) codes.unshift("BDT");
          codeCache = { codes, at: Date.now() };
          return codes;
        }
      }
    }
  } catch {
    // network/timeout/bad JSON — fall through to stale cache or the fallback list
  } finally {
    clearTimeout(timer);
  }
  return codeCache?.codes ?? FALLBACK_CODES;
}

/** Display symbol for a currency: fast-path map, else Intl, else the code. */
export function getCurrencySymbolFor(code: string): string {
  if (CURRENCY_SYMBOL[code]) return CURRENCY_SYMBOL[code];
  try {
    const parts = new Intl.NumberFormat("en", { style: "currency", currency: code }).formatToParts(
      0
    );
    return parts.find((p) => p.type === "currency")?.value ?? code;
  } catch {
    return code;
  }
}

/**
 * The selectable currencies with human names + symbols for the searchable
 * dropdown. Quick-pick currencies (BDT/USD/EUR/MYR) are surfaced first, the rest
 * alphabetically. Names/symbols come from Intl — no static table to maintain.
 */
export async function getCurrencyOptions(): Promise<CurrencyOption[]> {
  const codes = await getSupportedCurrencyCodes();
  let displayNames: Intl.DisplayNames | null = null;
  try {
    displayNames = new Intl.DisplayNames(["en"], { type: "currency" });
  } catch {
    displayNames = null;
  }

  const quick = SUPPORTED_CURRENCIES as readonly string[];
  const sorted = [...new Set(codes)].sort((a, b) => {
    const qa = quick.indexOf(a);
    const qb = quick.indexOf(b);
    if (qa !== -1 || qb !== -1) {
      if (qa === -1) return 1;
      if (qb === -1) return -1;
      return qa - qb;
    }
    return a.localeCompare(b);
  });

  return sorted.map((code) => {
    let name = code;
    try {
      name = displayNames?.of(code) ?? code;
    } catch {
      name = code;
    }
    const symbol = getCurrencySymbolFor(code);
    return { code, name, symbol, label: name && name !== code ? `${code} — ${name}` : code };
  });
}
