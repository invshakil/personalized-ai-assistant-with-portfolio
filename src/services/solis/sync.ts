// SolisCloud → local DB sync. Pulls daily energy flows and upserts one
// SolisDailyReading per inverter per day. Reports read the local rows, so they
// are instant and survive API downtime / rate limits.
//
// Strategy: each run syncs *today* from inverterDetail (live cumulative totals),
// enriched with today's intraday series for true peak power + SOC range. History
// is backfilled from inverterMonth, which returns per-day energy totals (the
// intraday inverterDay endpoint has no daily totals). Read-only — we never write
// to the API.
import { db } from "@/lib/db";
import {
  getSolisConfig,
  inverterDay,
  inverterDetail,
  inverterList,
  inverterMonth,
  userStationList,
  type SolisConfig,
} from "./client";
import {
  dailyFromInverterDetail,
  enrichFromDaySeries,
  mapInverters,
  mapMonthDays,
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

/** Ascending "yyyy-MM" list from `fromMonth` to `toMonth`, inclusive. */
function monthsBetween(fromMonth: string, toMonth: string): string[] {
  const [fy, fm] = fromMonth.split("-").map((n) => parseInt(n, 10));
  const [ty, tm] = toMonth.split("-").map((n) => parseInt(n, 10));
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while ((y < ty || (y === ty && m <= tm)) && out.length <= 120) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One API call per month covers all its days, so even a multi-year history is a
// handful of calls. Cap the months fetched per invocation as a safety bound.
const MONTH_CAP = 36;
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

/** Backfills every day of a month for one inverter from inverterMonth totals. */
async function syncInverterMonth(inv: SolisInverter, month: string, cfg: SolisConfig) {
  const resp = await inverterMonth({ sn: inv.sn, id: inv.id, month }, cfg);
  const days = mapMonthDays(resp);
  let written = 0;
  for (const d of days) {
    await upsertReading({ ...d, inverterSn: inv.sn });
    written++;
  }
  return written;
}

export interface SyncResult {
  ok: boolean;
  inverters: number;
  daysWritten: number;
  /** Months still unfetched after this call (UI loops until 0). */
  remaining: number;
  error?: string;
}

export interface SyncOptions {
  /** Backfill from the month of this yyyy-mm-dd up to the current month. */
  from?: string;
  /** Or backfill the last N days (resolved to whole months; ignored when `from` is set). */
  backfillDays?: number;
}

/**
 * Runs a sync: backfills daily totals month-by-month over the requested window
 * (one inverterMonth call per month), then refreshes today from the live
 * inverterDetail so it reflects the latest cumulative totals. Upserts are
 * idempotent. With no options it refreshes the current month + today. Records
 * status on SolarSettings.
 */
export async function runSolisSync(opts: SyncOptions = {}): Promise<SyncResult> {
  const cfg = getSolisConfig();
  let daysWritten = 0;
  let inverterCount = 0;
  let remaining = 0;
  try {
    const { inverters } = await discover(cfg);
    inverterCount = inverters.length;

    const today = localDateStr(new Date());
    const currentMonth = today.slice(0, 7);

    // Resolve the month window (defaults to the current month).
    let startMonth = currentMonth;
    if (opts.from) startMonth = opts.from.slice(0, 7);
    else if (opts.backfillDays && opts.backfillDays > 0) {
      startMonth = localDateStr(
        new Date(Date.now() - opts.backfillDays * 24 * 60 * 60 * 1000)
      ).slice(0, 7);
    }

    const months = monthsBetween(startMonth, currentMonth);
    const chunk = months.slice(0, MONTH_CAP);
    remaining = months.length - chunk.length;

    for (const month of chunk) {
      for (const inv of inverters) {
        try {
          daysWritten += await syncInverterMonth(inv, month, cfg);
        } catch {
          // Skip months the API can't serve; keep going.
        }
        await sleep(RATE_DELAY_MS);
      }
    }

    // Refresh today precisely from the live detail (overwrites the monthly row).
    for (const inv of inverters) {
      try {
        await syncInverterToday(inv, cfg);
      } catch {
        // Non-fatal — the monthly row for today still stands.
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
