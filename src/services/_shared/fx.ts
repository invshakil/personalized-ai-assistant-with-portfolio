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
import { SUPPORTED_CURRENCIES, type FxRateResult } from "@/types";

const API_BASE = "https://open.er-api.com/v6/latest";
const FETCH_TIMEOUT_MS = 4000;
// Reuse a cached rate this fresh before re-fetching (the feed updates ~daily).
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;

export function isSupportedCurrency(c: string): boolean {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(c);
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
