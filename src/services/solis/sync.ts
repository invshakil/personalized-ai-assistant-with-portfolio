// SolisCloud → local DB sync. Pulls daily energy flows and upserts one
// SolisDailyReading per inverter per day. Reports read the local rows, so they
// are instant and survive API downtime / rate limits.
//
// Strategy: each run syncs *today* from inverterDetail (live cumulative totals),
// enriched with today's intraday series for true peak power + SOC range. By
// day's end today's row holds the full day. An optional backfill re-derives the
// previous N days from inverterDay. Read-only — we never write to the API.
import { db } from "@/lib/db";
import {
  getSolisConfig,
  inverterDay,
  inverterDetail,
  inverterList,
  userStationList,
  type SolisConfig,
} from "./client";
import {
  dailyFromInverterDetail,
  enrichFromDaySeries,
  mapInverters,
  mapStations,
} from "./fieldMap";
import type { DailyEnergy, SolisInverter } from "./types";

const DHAKA_TZ = "Asia/Dhaka";

/** Local (Asia/Dhaka) yyyy-mm-dd for a given Date — solar days are local days. */
function localDateStr(d: Date): string {
  // en-CA gives yyyy-mm-dd; timeZone pins it to the plant's local day.
  return new Intl.DateTimeFormat("en-CA", { timeZone: DHAKA_TZ }).format(d);
}

/** Midnight (UTC-stored) marker for a yyyy-mm-dd local day. */
function dayDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

/** Ascending yyyy-mm-dd list from `fromStr` to `toStr`, inclusive. */
function daysBetween(fromStr: string, toStr: string): string[] {
  const out: string[] = [];
  let t = Date.parse(`${fromStr}T00:00:00.000Z`);
  const end = Date.parse(`${toStr}T00:00:00.000Z`);
  const DAY = 24 * 60 * 60 * 1000;
  while (t <= end && out.length <= 800) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += DAY;
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Bound a single sync call so it finishes well under a typical reverse-proxy
// timeout: at most this many past days are fetched per invocation (the UI loops
// until `remaining` hits 0; the scheduler chips away over its ticks).
const BACKFILL_CHUNK = 30;
const RATE_DELAY_MS = 350; // gentle with the SolisCloud rate limit (~3 req / 5s)

async function loadSettings() {
  return db.solarSettings.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}

/** Discovers the plant + inverters, caching plant id/capacity/location in settings. */
async function discover(cfg: SolisConfig) {
  const settings = await loadSettings();
  const stations = mapStations(await userStationList({}, cfg));
  if (stations.length === 0) throw new Error("SolisCloud returned no stations for this account.");

  // Prefer the cached station; else the first one.
  const station = stations.find((s) => s.id === settings.stationId) ?? stations[0];

  // Seed config from the API on first sight (don't overwrite user-set values).
  await db.solarSettings.update({
    where: { id: "singleton" },
    data: {
      stationId: station.id,
      ...(settings.systemSizeKwp == null && station.capacityKwp != null
        ? { systemSizeKwp: station.capacityKwp }
        : {}),
      ...(settings.latitude == null && station.latitude != null
        ? { latitude: station.latitude }
        : {}),
      ...(settings.longitude == null && station.longitude != null
        ? { longitude: station.longitude }
        : {}),
    },
  });

  const inverters = mapInverters(await inverterList({ stationId: station.id }, cfg)).filter(
    (iv) => iv.sn
  );
  if (inverters.length === 0) throw new Error("No inverters found under the plant.");
  return { stationId: station.id, inverters };
}

async function upsertReading(d: DailyEnergy) {
  const date = dayDate(d.date);
  const data = {
    generationKwh: d.generationKwh,
    gridImportKwh: d.gridImportKwh,
    gridExportKwh: d.gridExportKwh,
    batteryChargeKwh: d.batteryChargeKwh,
    batteryDischargeKwh: d.batteryDischargeKwh,
    consumptionKwh: d.consumptionKwh,
    peakPowerKw: d.peakPowerKw,
    batterySocMin: d.batterySocMin,
    batterySocMax: d.batterySocMax,
    inverterTempC: d.inverterTempC,
    raw: d.raw as object,
  };
  await db.solisDailyReading.upsert({
    where: { inverterSn_date: { inverterSn: d.inverterSn, date } },
    create: { inverterSn: d.inverterSn, date, ...data },
    update: data,
  });
}

/** Syncs today's reading for one inverter (detail totals + intraday enrich). */
async function syncInverterToday(inv: SolisInverter, cfg: SolisConfig) {
  const today = localDateStr(new Date());
  const detail = await inverterDetail({ id: inv.id, sn: inv.sn }, cfg);
  let daily = dailyFromInverterDetail(detail, inv.sn, today);
  try {
    const series = await inverterDay({ sn: inv.sn, id: inv.id, time: today }, cfg);
    daily = enrichFromDaySeries(daily, series);
  } catch {
    // Intraday series is a nice-to-have (peak/SOC); detail totals still stand.
  }
  await upsertReading(daily);
  return daily;
}

/** Re-derives a past day for one inverter from its inverterDay response. */
async function syncInverterDay(inv: SolisInverter, dateStr: string, cfg: SolisConfig) {
  const resp = await inverterDay({ sn: inv.sn, id: inv.id, time: dateStr }, cfg);
  // Day responses commonly carry daily totals at the top level alongside the
  // intraday series — reuse the same field extraction, then enrich peak/SOC.
  const daily = enrichFromDaySeries(dailyFromInverterDetail(resp, inv.sn, dateStr), resp);
  await upsertReading(daily);
  return daily;
}

export interface SyncResult {
  ok: boolean;
  inverters: number;
  daysWritten: number;
  /** Backfill days still missing after this call (UI loops until 0). */
  remaining: number;
  error?: string;
}

export interface SyncOptions {
  /** Backfill missing days from this yyyy-mm-dd up to today (oldest first). */
  from?: string;
  /** Or backfill the last N days (ignored when `from` is set). */
  backfillDays?: number;
}

/**
 * Runs a sync: refreshes today for every inverter, then backfills MISSING days
 * in the requested window (oldest first, capped at BACKFILL_CHUNK per call so a
 * single request stays short). Already-synced days are skipped, so repeated
 * calls make forward progress. Records status on SolarSettings.
 */
export async function runSolisSync(opts: SyncOptions = {}): Promise<SyncResult> {
  const cfg = getSolisConfig();
  let daysWritten = 0;
  let inverterCount = 0;
  let remaining = 0;
  try {
    const { inverters } = await discover(cfg);
    inverterCount = inverters.length;

    // Always refresh today's row.
    const today = localDateStr(new Date());
    for (const inv of inverters) {
      await syncInverterToday(inv, cfg);
      daysWritten++;
    }

    // Resolve the backfill window (exclusive of today — already synced above).
    let startStr: string | null = null;
    if (opts.from) startStr = opts.from.slice(0, 10);
    else if (opts.backfillDays && opts.backfillDays > 0) {
      startStr = localDateStr(new Date(Date.now() - opts.backfillDays * 24 * 60 * 60 * 1000));
    }

    if (startStr && startStr < today) {
      const window = daysBetween(startStr, today).filter((d) => d < today);
      // Days that already have at least one reading — skip them.
      const existing = await db.solisDailyReading.findMany({
        where: { date: { gte: dayDate(startStr), lt: dayDate(today) } },
        select: { date: true },
      });
      const have = new Set(existing.map((r) => r.date.toISOString().slice(0, 10)));
      const missing = window.filter((d) => !have.has(d)); // oldest first
      const chunk = missing.slice(0, BACKFILL_CHUNK);
      remaining = missing.length - chunk.length;

      for (const dateStr of chunk) {
        for (const inv of inverters) {
          try {
            await syncInverterDay(inv, dateStr, cfg);
            daysWritten++;
          } catch {
            // Skip days the API can't serve; keep going.
          }
          await sleep(RATE_DELAY_MS);
        }
      }
    }

    await db.solarSettings.update({
      where: { id: "singleton" },
      data: { lastSyncAt: new Date(), lastSyncStatus: "ok", lastSyncError: null },
    });
    return { ok: true, inverters: inverterCount, daysWritten, remaining };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Sync failed";
    await db.solarSettings
      .update({
        where: { id: "singleton" },
        data: { lastSyncAt: new Date(), lastSyncStatus: "error", lastSyncError: error },
      })
      .catch(() => {});
    return { ok: false, inverters: inverterCount, daysWritten, remaining, error };
  }
}

const SYNC_MIN_GAP_MS = 2 * 60 * 60 * 1000; // don't re-sync more than every 2h

/** True if a scheduled sync is due (configured + last sync older than the gap). */
export async function isSyncDue(): Promise<boolean> {
  if (!process.env.SOLIS_KEY_ID || !process.env.SOLIS_KEY_SECRET) return false;
  const s = await db.solarSettings.findUnique({ where: { id: "singleton" } });
  if (!s?.lastSyncAt) return true;
  return Date.now() - s.lastSyncAt.getTime() >= SYNC_MIN_GAP_MS;
}

/**
 * Scheduler entry point — refreshes today and chips away at any missing history
 * from the install date (a chunk per tick), so history fills in over time with
 * no manual action. Falls back to a 2-day backfill when no install date is set.
 */
export async function runScheduledSyncIfDue(): Promise<void> {
  if (!(await isSyncDue())) return;
  const s = await db.solarSettings.findUnique({ where: { id: "singleton" } });
  const from = s?.installDate ? s.installDate.toISOString().slice(0, 10) : undefined;
  await runSolisSync(from ? { from } : { backfillDays: 2 });
}
