// Solar monitoring — shared types (reports, payback, overview). Re-exported
// through the @/types barrel. Energy in kWh, power in kW, money in the
// configured currency (BDT), percentages 0–100.

/** One month of aggregated solar energy + cost, with consumption source split. */
export interface SolarMonthRow {
  month: string; // "YYYY-MM"
  label: string; // "Jun 2026"
  generationKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  batteryChargeKwh: number;
  batteryDischargeKwh: number;
  consumptionKwh: number;
  // Consumption broken down by source (sums to consumptionKwh).
  fromSolarDirectKwh: number;
  fromBatteryKwh: number;
  fromGridKwh: number;
  // Cost (under the tariff effective that month).
  actualCost: number; // bill for grid-import units
  wouldHaveCost: number; // bill if all consumption were grid
  savings: number; // wouldHaveCost − actualCost
  // Insight.
  selfSufficiencyPct: number; // (consumption − import) / consumption
  co2AvoidedKg: number;
  peakPowerKw: number;
  tariffName: string | null;
}

/** Payback / ROI tracker against the system install cost. */
export interface SolarPayback {
  installCost: number;
  currency: string;
  installDate: string | null;
  cumulativeSavings: number;
  percentRecovered: number; // 0–100+
  remaining: number; // installCost − cumulativeSavings
  monthsElapsed: number;
  avgMonthlySavings: number;
  projectedMonthsToBreakEven: number | null; // null = can't project yet
  projectedBreakEvenDate: string | null; // ISO; null when already recovered or unknown
}

/** Compact cross-domain snapshot for the dashboard + AI overview. */
export interface SolarOverview {
  configured: boolean; // Solis credentials present in env
  hasData: boolean; // any readings synced yet
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  currency: string;
  monthLabel: string;
  monthGenerationKwh: number;
  monthConsumptionKwh: number;
  monthSavings: number;
  monthSelfSufficiencyPct: number;
  lifetimeGenerationKwh: number;
  lifetimeSavings: number;
  lifetimeCo2AvoidedKg: number;
  latestBatterySoc: number | null;
  payback: SolarPayback;
}

/** One day of weather forecast + the generation it's expected to drive. */
export interface SolarWeatherDay {
  date: string; // "YYYY-MM-DD"
  tempMaxC: number | null;
  tempMinC: number | null;
  cloudCoverPct: number | null;
  radiationKwhM2: number | null; // shortwave radiation sum ≈ peak sun hours
  precipProbPct: number | null;
  weatherCode: number | null;
  description: string;
  predictedGenerationKwh: number | null; // null until system size is known
}

/** 7-day forecast for the plant location. */
export interface SolarWeather {
  available: boolean; // false when location isn't set
  latitude: number | null;
  longitude: number | null;
  days: SolarWeatherDay[];
}

/** Full report payload for the Solar Reports page + AI. */
export interface SolarReport {
  months: SolarMonthRow[];
  payback: SolarPayback;
  totals: {
    generationKwh: number;
    consumptionKwh: number;
    gridImportKwh: number;
    savings: number;
    co2AvoidedKg: number;
  };
  currency: string;
}
