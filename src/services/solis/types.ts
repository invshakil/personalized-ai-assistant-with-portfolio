// SolisCloud API — types. Response payloads vary slightly by inverter model and
// firmware, so raw shapes are kept loose (Record<string, unknown>) and narrowed
// in fieldMap.ts. The normalized DailyEnergy shape is what the rest of the app
// consumes.

/** Loose JSON object from the API. */
export type SolisJson = Record<string, unknown>;

/** Standard SolisCloud envelope: { success, code, msg, data }. */
export interface SolisEnvelope<T = SolisJson> {
  success?: boolean;
  code?: string;
  msg?: string;
  data?: T;
}

/** A plant/station as returned by userStationList. */
export interface SolisStation {
  id: string;
  name: string;
  /** Installed DC capacity in kWp, if reported. */
  capacityKwp: number | null;
  latitude: number | null;
  longitude: number | null;
  raw: SolisJson;
}

/** An inverter as returned by inverterList. */
export interface SolisInverter {
  id: string;
  sn: string;
  name: string;
  stationId: string | null;
  raw: SolisJson;
}

/**
 * Normalized daily energy flows for one inverter on one day. All energies are
 * kWh; power is kW; SOC is %. Null means "not reported by this inverter".
 */
export interface DailyEnergy {
  date: string; // yyyy-mm-dd (local)
  inverterSn: string;
  generationKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  batteryChargeKwh: number;
  batteryDischargeKwh: number;
  consumptionKwh: number;
  peakPowerKw: number;
  batterySocMin: number | null;
  batterySocMax: number | null;
  inverterTempC: number | null;
  raw: SolisJson;
}
