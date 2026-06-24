// Solar reports — aggregates SolisDailyReading rows into monthly energy + cost
// figures, the consumption source split, and the payback tracker. Cost uses the
// effective-dated tariff in force each month. All money is in the configured
// currency (BDT).
import { db } from "@/lib/db";
import type { SolarMonthRow, SolarOverview, SolarPayback, SolarReport } from "@/types";
import { kwh, money, toNum } from "./_serializers";
import { getSolarSettings } from "./settings";
import { computeBill, listTariffs, type TariffRow } from "./tariff";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Readings are stored at midnight UTC of the local day, so UTC components give
// the local calendar day/month — no timezone drift.
function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split("-").map((n) => parseInt(n, 10));
  return `${MONTHS[m - 1]} ${y}`;
}
function monthStartUtc(key: string): Date {
  const [y, m] = key.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, m - 1, 1));
}

interface MonthSums {
  generation: number;
  gridImport: number;
  gridExport: number;
  batteryCharge: number;
  batteryDischarge: number;
  consumption: number;
  peakPowerKw: number;
}

function emptySums(): MonthSums {
  return {
    generation: 0,
    gridImport: 0,
    gridExport: 0,
    batteryCharge: 0,
    batteryDischarge: 0,
    consumption: 0,
    peakPowerKw: 0,
  };
}

type ReadingRow = {
  date: Date;
  generationKwh: { toNumber(): number };
  gridImportKwh: { toNumber(): number };
  gridExportKwh: { toNumber(): number };
  batteryChargeKwh: { toNumber(): number };
  batteryDischargeKwh: { toNumber(): number };
  consumptionKwh: { toNumber(): number };
  peakPowerKw: { toNumber(): number };
};

/** Sum readings (across inverters + days) into per-month buckets. */
function aggregate(readings: ReadingRow[]): Map<string, MonthSums> {
  const map = new Map<string, MonthSums>();
  for (const r of readings) {
    const key = monthKey(r.date);
    const s = map.get(key) ?? emptySums();
    s.generation += toNum(r.generationKwh);
    s.gridImport += toNum(r.gridImportKwh);
    s.gridExport += toNum(r.gridExportKwh);
    s.batteryCharge += toNum(r.batteryChargeKwh);
    s.batteryDischarge += toNum(r.batteryDischargeKwh);
    s.consumption += toNum(r.consumptionKwh);
    s.peakPowerKw = Math.max(s.peakPowerKw, toNum(r.peakPowerKw));
    map.set(key, s);
  }
  return map;
}

/** Tariff in force for a month key (latest effectiveFrom <= month start). */
function pickTariff(tariffs: TariffRow[], key: string): TariffRow | null {
  const start = monthStartUtc(key).getTime();
  let chosen: TariffRow | null = null;
  for (const t of tariffs) {
    if (t.effectiveFrom && new Date(t.effectiveFrom).getTime() <= start) chosen = t;
  }
  return chosen;
}

function buildMonthRow(
  key: string,
  s: MonthSums,
  tariff: TariffRow | null,
  co2Factor: number
): SolarMonthRow {
  // Total household load: prefer the inverter-reported consumption; otherwise
  // derive from the energy balance (PV either serves load, charges the battery,
  // or is exported; battery discharge + grid import also serve load).
  const consumption =
    s.consumption > 0
      ? s.consumption
      : Math.max(
          0,
          s.generation + s.gridImport + s.batteryDischarge - s.batteryCharge - s.gridExport
        );

  // Source split of consumption: grid first, then battery, remainder is solar-direct.
  const fromGrid = Math.min(s.gridImport, consumption);
  const fromBattery = Math.min(s.batteryDischarge, Math.max(0, consumption - fromGrid));
  const fromSolarDirect = Math.max(0, consumption - fromGrid - fromBattery);

  const actualCost = tariff ? computeBill(s.gridImport, tariff).total : 0;
  const wouldHaveCost = tariff ? computeBill(consumption, tariff).total : 0;
  const savings = wouldHaveCost - actualCost;

  const selfSufficiencyPct =
    consumption > 0
      ? Math.max(0, Math.min(100, ((consumption - s.gridImport) / consumption) * 100))
      : 0;
  const co2AvoidedKg = Math.max(0, consumption - s.gridImport) * co2Factor;

  return {
    month: key,
    label: monthLabel(key),
    generationKwh: kwh(s.generation),
    gridImportKwh: kwh(s.gridImport),
    gridExportKwh: kwh(s.gridExport),
    batteryChargeKwh: kwh(s.batteryCharge),
    batteryDischargeKwh: kwh(s.batteryDischarge),
    consumptionKwh: kwh(consumption),
    fromSolarDirectKwh: kwh(fromSolarDirect),
    fromBatteryKwh: kwh(fromBattery),
    fromGridKwh: kwh(fromGrid),
    actualCost: money(actualCost),
    wouldHaveCost: money(wouldHaveCost),
    savings: money(savings),
    selfSufficiencyPct: Math.round(selfSufficiencyPct * 10) / 10,
    co2AvoidedKg: Math.round(co2AvoidedKg * 10) / 10,
    peakPowerKw: kwh(s.peakPowerKw),
    tariffName: tariff?.name ?? null,
  };
}

/** Months elapsed between an install date and now (at least 1). */
function monthsSince(installDate: string | null, fallbackCount: number): number {
  if (!installDate) return Math.max(1, fallbackCount);
  const start = new Date(installDate);
  const now = new Date();
  const months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth()) +
    1;
  return Math.max(1, months);
}

function buildPayback(
  allMonths: SolarMonthRow[],
  installCost: number,
  currency: string,
  installDate: string | null
): SolarPayback {
  const cumulativeSavings = allMonths.reduce((sum, m) => sum + m.savings, 0);
  const monthsElapsed = monthsSince(installDate, allMonths.length);
  const avgMonthlySavings = cumulativeSavings / monthsElapsed;
  const remaining = installCost - cumulativeSavings;
  const percentRecovered = installCost > 0 ? (cumulativeSavings / installCost) * 100 : 0;

  let projectedMonthsToBreakEven: number | null = null;
  let projectedBreakEvenDate: string | null = null;
  if (remaining <= 0) {
    projectedMonthsToBreakEven = 0;
  } else if (avgMonthlySavings > 0) {
    projectedMonthsToBreakEven = Math.ceil(remaining / avgMonthlySavings);
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + projectedMonthsToBreakEven);
    projectedBreakEvenDate = d.toISOString();
  }

  return {
    installCost: money(installCost),
    currency,
    installDate,
    cumulativeSavings: money(cumulativeSavings),
    percentRecovered: Math.round(percentRecovered * 10) / 10,
    remaining: money(remaining),
    monthsElapsed,
    avgMonthlySavings: money(avgMonthlySavings),
    projectedMonthsToBreakEven,
    projectedBreakEvenDate,
  };
}

export interface SolarReportRange {
  from?: string; // "YYYY-MM-DD" inclusive
  to?: string; // "YYYY-MM-DD" inclusive
}

/** Build all monthly rows from every reading (used for payback + filtered views). */
async function allMonthRows(): Promise<{
  rows: SolarMonthRow[];
  settings: Awaited<ReturnType<typeof getSolarSettings>>;
}> {
  const [readings, tariffs, settings] = await Promise.all([
    db.solisDailyReading.findMany({
      orderBy: { date: "asc" },
      select: {
        date: true,
        generationKwh: true,
        gridImportKwh: true,
        gridExportKwh: true,
        batteryChargeKwh: true,
        batteryDischargeKwh: true,
        consumptionKwh: true,
        peakPowerKw: true,
      },
    }),
    listTariffs(),
    getSolarSettings(),
  ]);
  const agg = aggregate(readings);
  const rows = [...agg.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, sums]) =>
      buildMonthRow(key, sums, pickTariff(tariffs, key), settings.co2FactorKgPerKwh)
    );
  return { rows, settings };
}

export async function getSolarReport(range: SolarReportRange = {}): Promise<SolarReport> {
  const { rows, settings } = await allMonthRows();

  const fromKey = range.from ? range.from.slice(0, 7) : null;
  const toKey = range.to ? range.to.slice(0, 7) : null;
  const months = rows.filter(
    (r) => (!fromKey || r.month >= fromKey) && (!toKey || r.month <= toKey)
  );

  const payback = buildPayback(rows, settings.installCost, settings.currency, settings.installDate);
  const totals = months.reduce(
    (t, m) => ({
      generationKwh: t.generationKwh + m.generationKwh,
      consumptionKwh: t.consumptionKwh + m.consumptionKwh,
      gridImportKwh: t.gridImportKwh + m.gridImportKwh,
      savings: t.savings + m.savings,
      co2AvoidedKg: t.co2AvoidedKg + m.co2AvoidedKg,
    }),
    { generationKwh: 0, consumptionKwh: 0, gridImportKwh: 0, savings: 0, co2AvoidedKg: 0 }
  );

  return {
    months,
    payback,
    totals: {
      generationKwh: kwh(totals.generationKwh),
      consumptionKwh: kwh(totals.consumptionKwh),
      gridImportKwh: kwh(totals.gridImportKwh),
      savings: money(totals.savings),
      co2AvoidedKg: Math.round(totals.co2AvoidedKg * 10) / 10,
    },
    currency: settings.currency,
  };
}

export async function getSolarOverview(): Promise<SolarOverview> {
  const { rows, settings } = await allMonthRows();
  const payback = buildPayback(rows, settings.installCost, settings.currency, settings.installDate);

  const nowKey = monthKey(new Date());
  const thisMonth = rows.find((r) => r.month === nowKey);

  const lifetimeGenerationKwh = rows.reduce((s, m) => s + m.generationKwh, 0);
  const lifetimeSavings = rows.reduce((s, m) => s + m.savings, 0);
  const lifetimeCo2AvoidedKg = rows.reduce((s, m) => s + m.co2AvoidedKg, 0);

  // Latest synced SOC (max of the most recent reading day).
  const latest = await db.solisDailyReading.findFirst({
    orderBy: { date: "desc" },
    select: { batterySocMax: true },
  });

  return {
    configured: settings.configured,
    hasData: rows.length > 0,
    lastSyncAt: settings.lastSyncAt,
    lastSyncStatus: settings.lastSyncStatus,
    currency: settings.currency,
    monthLabel: monthLabel(nowKey),
    monthGenerationKwh: thisMonth?.generationKwh ?? 0,
    monthConsumptionKwh: thisMonth?.consumptionKwh ?? 0,
    monthSavings: thisMonth?.savings ?? 0,
    monthSelfSufficiencyPct: thisMonth?.selfSufficiencyPct ?? 0,
    lifetimeGenerationKwh: kwh(lifetimeGenerationKwh),
    lifetimeSavings: money(lifetimeSavings),
    lifetimeCo2AvoidedKg: Math.round(lifetimeCo2AvoidedKg * 10) / 10,
    latestBatterySoc: latest?.batterySocMax != null ? toNum(latest.batterySocMax) : null,
    payback,
  };
}
