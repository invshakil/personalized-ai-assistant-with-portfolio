// SolisCloud field mapping — the SINGLE place that knows raw API field names.
//
// Solis response field names vary by inverter model + firmware. Every candidate
// key list below is generous on purpose; if your inverter reports a field under
// a different name, add it to the relevant list here and nothing else changes.
// The `npm run solis:test` script prints the raw JSON so these can be verified
// against your actual inverter.
import type { DailyEnergy, SolisInverter, SolisJson, SolisStation } from "./types";

/** First present, finite numeric value across candidate keys (else fallback). */
function num(obj: SolisJson, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return fallback;
}

/** Like num() but returns null when no candidate key is present. */
function numOrNull(obj: SolisJson, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function str(obj: SolisJson, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim() !== "") return v;
    if (typeof v === "number") return String(v);
  }
  return "";
}

/** Pulls the array of records out of a list response (handles page-wrapped shapes). */
export function records(data: SolisJson): SolisJson[] {
  const page = data.page as SolisJson | undefined;
  const candidates = [page?.records, data.records, data.stationStatusVo, data.list];
  for (const c of candidates) if (Array.isArray(c)) return c as SolisJson[];
  return Array.isArray(data) ? (data as SolisJson[]) : [];
}

export function mapStations(data: SolisJson): SolisStation[] {
  return records(data).map((r) => ({
    id: str(r, ["id", "stationId"]),
    name: str(r, ["stationName", "name"]),
    capacityKwp: numOrNull(r, ["capacity", "capacityStr", "stationCapacity"]),
    latitude: numOrNull(r, ["latitude", "lat"]),
    longitude: numOrNull(r, ["longitude", "lng", "lon"]),
    raw: r,
  }));
}

export function mapInverters(data: SolisJson): SolisInverter[] {
  return records(data).map((r) => ({
    id: str(r, ["id"]),
    sn: str(r, ["sn", "inverterSn", "serial"]),
    name: str(r, ["name", "inverterName", "stationName"]),
    stationId: str(r, ["stationId", "stationsId"]) || null,
    raw: r,
  }));
}

// Energy in detail responses is reported in kWh; power (pac) is usually in W.
// We expose peak as the instantaneous AC power at sync time (kW) as a fallback;
// enrichFromDaySeries() upgrades it to the true daily peak when an intraday
// series is available.

/** Build a normalized DailyEnergy from an inverterDetail payload. */
export function dailyFromInverterDetail(
  raw: SolisJson,
  inverterSn: string,
  date: string
): DailyEnergy {
  // pac may be W or kW depending on firmware; pacStr/pacPec carries the unit.
  const pac = num(raw, ["pac", "power"]);
  const pacUnit = str(raw, ["pacStr", "powerStr"]).toLowerCase();
  const peakPowerKw = pacUnit.includes("kw") ? pac : pac / 1000;

  const soc = numOrNull(raw, ["batteryCapacitySoc", "batterySoc", "soc"]);

  return {
    date,
    inverterSn,
    generationKwh: num(raw, ["eToday", "dayEnergy", "etoday1", "pvToday"]),
    gridImportKwh: num(raw, [
      "gridPurchasedTodayEnergy",
      "gridPurchasedDayEnergy",
      "psumTodayBuy",
      "gridBuyToday",
    ]),
    gridExportKwh: num(raw, [
      "gridSellTodayEnergy",
      "gridSellDayEnergy",
      "psumTodaySell",
      "gridSellToday",
    ]),
    batteryChargeKwh: num(raw, [
      "batteryChargeEnergyToday",
      "batteryTodayChargeEnergy",
      "batteryChargeTodayEnergy",
    ]),
    batteryDischargeKwh: num(raw, [
      "batteryDischargeEnergyToday",
      "batteryTodayDischargeEnergy",
      "batteryDischargeTodayEnergy",
    ]),
    consumptionKwh: num(raw, [
      "homeLoadTodayEnergy",
      "familyLoadEnergy",
      "consumeEnergy",
      "homeLoadEnergyToday",
    ]),
    peakPowerKw,
    batterySocMin: soc,
    batterySocMax: soc,
    inverterTempC: numOrNull(raw, ["inverterTemperature", "temperature", "temp"]),
    raw,
  };
}

/**
 * Upgrades a DailyEnergy with true daily peak power + SOC range from an
 * inverterDay intraday series (array of time-stamped points). Falls back to the
 * detail-derived values when the series is absent or empty.
 */
export function enrichFromDaySeries(daily: DailyEnergy, daySeries: SolisJson): DailyEnergy {
  const points = records(daySeries);
  if (points.length === 0) return daily;

  let peakKw = daily.peakPowerKw;
  let socMin = daily.batterySocMin;
  let socMax = daily.batterySocMax;

  for (const p of points) {
    const pac = num(p, ["pac", "power"]);
    const unit = str(p, ["pacStr", "powerStr"]).toLowerCase();
    const kw = unit.includes("kw") ? pac : pac / 1000;
    if (kw > peakKw) peakKw = kw;

    const soc = numOrNull(p, ["batteryCapacitySoc", "batterySoc", "soc"]);
    if (soc != null) {
      socMin = socMin == null ? soc : Math.min(socMin, soc);
      socMax = socMax == null ? soc : Math.max(socMax, soc);
    }
  }
  return { ...daily, peakPowerKw: peakKw, batterySocMin: socMin, batterySocMax: socMax };
}
