// Feature-local types for the Solar Reports page.

/** Range presets on the toolbar. "MONTH" filters to one picked calendar month. */
export type RangePreset = "1M" | "3M" | "6M" | "12M" | "ALL" | "MONTH";

/** Server-side from/to bounds sent to the report API. Empty means "all time". */
export interface RangeBounds {
  from?: string;
  to?: string;
}

/** Sums across the months in view — see `useSolarTotals`. */
export interface SolarTotals {
  generationKwh: number;
  consumptionKwh: number;
  gridImportKwh: number;
  gridExportKwh: number;
  fromSolarDirectKwh: number;
  fromBatteryKwh: number;
  fromGridKwh: number;
  savings: number;
  wouldHaveCost: number;
  actualCost: number;
  co2AvoidedKg: number;
}
