import { useMemo } from "react";
import type { SolarMonthRow } from "@/types";
import type { SolarTotals } from "../types";

const EMPTY: SolarTotals = {
  generationKwh: 0,
  consumptionKwh: 0,
  gridImportKwh: 0,
  gridExportKwh: 0,
  fromSolarDirectKwh: 0,
  fromBatteryKwh: 0,
  fromGridKwh: 0,
  savings: 0,
  wouldHaveCost: 0,
  actualCost: 0,
  co2AvoidedKg: 0,
};

/** Sum source-split + totals across the months in view. */
export function sumMonths(months: SolarMonthRow[]): SolarTotals {
  return months.reduce(
    (acc, m) => ({
      generationKwh: acc.generationKwh + m.generationKwh,
      consumptionKwh: acc.consumptionKwh + m.consumptionKwh,
      gridImportKwh: acc.gridImportKwh + m.gridImportKwh,
      gridExportKwh: acc.gridExportKwh + m.gridExportKwh,
      fromSolarDirectKwh: acc.fromSolarDirectKwh + m.fromSolarDirectKwh,
      fromBatteryKwh: acc.fromBatteryKwh + m.fromBatteryKwh,
      fromGridKwh: acc.fromGridKwh + m.fromGridKwh,
      savings: acc.savings + m.savings,
      wouldHaveCost: acc.wouldHaveCost + m.wouldHaveCost,
      actualCost: acc.actualCost + m.actualCost,
      co2AvoidedKg: acc.co2AvoidedKg + m.co2AvoidedKg,
    }),
    EMPTY
  );
}

/**
 * Period totals plus the share each power source contributed. `pctOf` guards
 * the zero-total case so an empty period renders 0% rather than NaN.
 */
export function useSolarTotals(months: SolarMonthRow[]) {
  return useMemo(() => {
    const totals = sumMonths(months);
    const sourceTotal = totals.fromSolarDirectKwh + totals.fromBatteryKwh + totals.fromGridKwh;
    const pctOf = (v: number) => (sourceTotal > 0 ? (v / sourceTotal) * 100 : 0);
    return { totals, sourceTotal, pctOf };
  }, [months]);
}
