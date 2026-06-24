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
  error?: string;
}

/**
 * Runs a sync: today for every inverter, plus an optional backfill of the
 * previous `backfillDays` days. Records status on SolarSettings.
 */
export async function runSolisSync(opts: { backfillDays?: number } = {}): Promise<SyncResult> {
  const cfg = getSolisConfig();
  let daysWritten = 0;
  let inverterCount = 0;
  try {
    const { inverters } = await discover(cfg);
    inverterCount = inverters.length;

    for (const inv of inverters) {
      await syncInverterToday(inv, cfg);
      daysWritten++;
    }

    const backfill = Math.max(0, Math.min(opts.backfillDays ?? 0, 365));
    for (let i = 1; i <= backfill; i++) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = localDateStr(d);
      for (const inv of inverters) {
        try {
          await syncInverterDay(inv, dateStr, cfg);
          daysWritten++;
        } catch {
          // Skip days the API can't serve; keep going.
        }
      }
    }

    await db.solarSettings.update({
      where: { id: "singleton" },
      data: { lastSyncAt: new Date(), lastSyncStatus: "ok", lastSyncError: null },
    });
    return { ok: true, inverters: inverterCount, daysWritten };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Sync failed";
    await db.solarSettings
      .update({
        where: { id: "singleton" },
        data: { lastSyncAt: new Date(), lastSyncStatus: "error", lastSyncError: error },
      })
      .catch(() => {});
    return { ok: false, inverters: inverterCount, daysWritten, error };
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

/** Scheduler entry point — syncs today (+1 day backfill to finalize yesterday). */
export async function runScheduledSyncIfDue(): Promise<void> {
  if (!(await isSyncDue())) return;
  await runSolisSync({ backfillDays: 1 });
}
