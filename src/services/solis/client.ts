// SolisCloud API client — READ ONLY.
//
// SolisCloud authenticates every request with an HMAC-SHA1 signature over the
// verb, a Content-MD5 of the JSON body, the content-type, a GMT Date header,
// and the request path:
//
//   Content-MD5   = base64(md5(body))
//   StringToSign  = VERB\nContent-MD5\nContent-Type\nDate\nCanonicalResource
//   Sign          = base64(hmacSha1(StringToSign, KeySecret))
//   Authorization = "API <KeyId>:<Sign>"
//
// Credentials come from env (SOLIS_KEY_ID / SOLIS_KEY_SECRET / SOLIS_API_URL) —
// never the DB. Only read endpoints are exposed below; this client deliberately
// implements NO inverter-control / write endpoints. Do not add any.
import crypto from "node:crypto";
import type { SolisEnvelope, SolisJson } from "./types";

const CONTENT_TYPE = "application/json";

export interface SolisConfig {
  keyId: string;
  keySecret: string;
  baseUrl: string;
}

/** Reads + validates Solis credentials from env. Throws a clear UI-facing error. */
export function getSolisConfig(): SolisConfig {
  const keyId = process.env.SOLIS_KEY_ID;
  const keySecret = process.env.SOLIS_KEY_SECRET;
  const baseUrl = process.env.SOLIS_API_URL ?? "https://www.soliscloud.com:13333";
  if (!keyId || !keySecret) {
    throw new Error(
      "SolisCloud is not configured. Set SOLIS_KEY_ID and SOLIS_KEY_SECRET in .env.local."
    );
  }
  return { keyId, keySecret, baseUrl: baseUrl.replace(/\/+$/, "") };
}

/** True if Solis credentials are present — used to show a status hint in the UI. */
export function isSolisConfigured(): boolean {
  return Boolean(process.env.SOLIS_KEY_ID && process.env.SOLIS_KEY_SECRET);
}

function md5Base64(body: string): string {
  return crypto.createHash("md5").update(body, "utf8").digest("base64");
}

function hmacSha1Base64(stringToSign: string, secret: string): string {
  return crypto.createHmac("sha1", secret).update(stringToSign, "utf8").digest("base64");
}

/**
 * Signs + POSTs to a SolisCloud read endpoint and returns the `data` payload.
 * Private on purpose — callers use the named read helpers below so no arbitrary
 * (and possibly write) path can be hit.
 */
async function signedRead<T = SolisJson>(
  path: string,
  payload: SolisJson,
  cfg: SolisConfig = getSolisConfig()
): Promise<T> {
  const body = JSON.stringify(payload);
  const contentMd5 = md5Base64(body);
  const date = new Date().toUTCString(); // RFC1123 GMT, e.g. "Tue, 24 Jun 2026 12:00:00 GMT"
  const stringToSign = ["POST", contentMd5, CONTENT_TYPE, date, path].join("\n");
  const sign = hmacSha1Base64(stringToSign, cfg.keySecret);

  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": CONTENT_TYPE,
      "Content-MD5": contentMd5,
      Date: date,
      Authorization: `API ${cfg.keyId}:${sign}`,
    },
    body,
  });

  const text = await res.text();
  let json: SolisEnvelope<T>;
  try {
    json = JSON.parse(text) as SolisEnvelope<T>;
  } catch {
    throw new Error(
      `SolisCloud returned a non-JSON response (HTTP ${res.status}): ${text.slice(0, 200)}`
    );
  }

  if (!res.ok || json.success === false) {
    throw new Error(
      `SolisCloud ${path} failed: ${json.code ?? res.status} ${json.msg ?? res.statusText}`
    );
  }
  return (json.data ?? {}) as T;
}

// ── Read endpoints (the complete set we use; all read-only) ──────────────────

/** List the plants/stations on the account. */
export function userStationList(
  payload: { pageNo?: number; pageSize?: number } = {},
  cfg?: SolisConfig
): Promise<SolisJson> {
  return signedRead("/v1/api/userStationList", { pageNo: 1, pageSize: 100, ...payload }, cfg);
}

/** Plant detail (current power, today/total energy, capacity, location). */
export function stationDetail(stationId: string, cfg?: SolisConfig): Promise<SolisJson> {
  return signedRead("/v1/api/stationDetail", { id: stationId }, cfg);
}

/** List inverters under a plant. */
export function inverterList(
  payload: { stationId?: string; pageNo?: number; pageSize?: number } = {},
  cfg?: SolisConfig
): Promise<SolisJson> {
  return signedRead("/v1/api/inverterList", { pageNo: 1, pageSize: 100, ...payload }, cfg);
}

/** Inverter detail — real-time + today's totals, battery SOC, temperature. */
export function inverterDetail(
  payload: { id?: string; sn?: string },
  cfg?: SolisConfig
): Promise<SolisJson> {
  return signedRead("/v1/api/inverterDetail", payload, cfg);
}

/** One day's intraday series for an inverter (yyyy-MM-dd). */
export function inverterDay(
  payload: { sn: string; id?: string; time: string; timeZone?: number; money?: string },
  cfg?: SolisConfig
): Promise<SolisJson> {
  return signedRead("/v1/api/inverterDay", { timeZone: 6, money: "BDT", ...payload }, cfg);
}

/**
 * Per-day energy totals for an inverter across a month (yyyy-MM). Unlike
 * inverterDay (intraday series), this returns one record per day with daily
 * energy figures — the right source for historical backfill.
 */
export function inverterMonth(
  payload: { sn: string; id?: string; month: string; timeZone?: number; money?: string },
  cfg?: SolisConfig
): Promise<SolisJson> {
  return signedRead("/v1/api/inverterMonth", { timeZone: 6, money: "BDT", ...payload }, cfg);
}

/** One day's intraday series for a plant (yyyy-MM-dd). */
export function stationDay(
  payload: { id: string; time: string; timeZone?: number; money?: string },
  cfg?: SolisConfig
): Promise<SolisJson> {
  return signedRead("/v1/api/stationDay", { timeZone: 6, money: "BDT", ...payload }, cfg);
}
