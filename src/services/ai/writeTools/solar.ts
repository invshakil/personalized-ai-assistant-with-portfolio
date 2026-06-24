// Solar write tools. These mutate LOCAL data only — solar settings, electricity
// tariffs, and triggering a sync (which READS from SolisCloud and writes local
// readings). None of them write to / control the inverter via the Solis API.
// Two-phase like every write tool: preview (no mutation) → commit on approval.
import { createTariff, updateSolarSettings, type TariffSlabInput } from "@/services/solar";
import { runSolisSync } from "@/services/solis";
import {
  write,
  schema,
  Str,
  Num,
  Int,
  taka,
  reqStr,
  optNum,
  optStr,
  optDate,
  requireUpdate,
  type Raw,
  type WriteToolDef,
} from "./shared";

function parseSlabs(v: unknown): TariffSlabInput[] {
  if (!Array.isArray(v) || v.length === 0)
    throw new Error("Provide at least one slab (fromUnit, toUnit, rate).");
  return v.map((rawSlab, i) => {
    const s = (rawSlab ?? {}) as Raw;
    const fromUnit = optNum(s.fromUnit);
    const rate = optNum(s.rate);
    if (fromUnit === undefined) throw new Error(`Slab ${i + 1}: fromUnit is required.`);
    if (rate === undefined) throw new Error(`Slab ${i + 1}: rate is required.`);
    const toUnit = s.toUnit === null ? null : (optNum(s.toUnit) ?? null);
    return { fromUnit, toUnit, rate };
  });
}

export const solarTools: WriteToolDef[] = [
  write({
    name: "sync_solar_data",
    description:
      "Pull the latest solar data from SolisCloud into the local database (today, plus an optional " +
      "backfill of recent days). This only READS from SolisCloud and writes local readings — it never " +
      "controls the inverter. Propose this when the user asks to refresh / update solar data.",
    parameters: schema({
      backfillDays: Int("How many previous days to also re-fetch (optional, 0–365, default 0)"),
    }),
    parse: (i) => ({ backfillDays: Math.max(0, Math.min(optNum(i.backfillDays) ?? 0, 365)) }),
    preview: async (a) =>
      `Sync solar data from SolisCloud now${a.backfillDays ? ` (today + last ${a.backfillDays} day(s))` : " (today)"}.`,
    commit: async (a) => {
      const r = await runSolisSync({ backfillDays: a.backfillDays });
      if (!r.ok) throw new Error(r.error ?? "Sync failed.");
      return {
        summary: `Synced ${r.daysWritten} reading(s) across ${r.inverters} inverter(s).`,
        data: r,
      };
    },
  }),

  write({
    name: "update_solar_settings",
    description:
      "Update solar system settings: system size (kWp), battery capacity (kWh), total install cost (BDT, " +
      "for the payback tracker), install/commissioning date, plant latitude/longitude (for the weather " +
      "forecast), grid CO2 factor (kg/kWh), or currency. Only the fields you pass are changed.",
    parameters: schema({
      systemSizeKwp: Num("Array DC capacity in kWp (optional)"),
      batteryKwh: Num("Battery storage capacity in kWh (optional)"),
      installCost: Num("Total system install cost in BDT (optional)"),
      installDate: Str("Install/commissioning date YYYY-MM-DD (optional)"),
      latitude: Num("Plant latitude (optional)"),
      longitude: Num("Plant longitude (optional)"),
      co2FactorKgPerKwh: Num("Grid emission factor in kg CO2 per kWh (optional)"),
      currency: Str("Currency code, e.g. BDT (optional)"),
    }),
    parse: (i) => {
      const a = {
        systemSizeKwp: optNum(i.systemSizeKwp),
        batteryKwh: optNum(i.batteryKwh),
        installCost: optNum(i.installCost),
        installDate: optDate(i.installDate, "installDate"),
        latitude: optNum(i.latitude),
        longitude: optNum(i.longitude),
        co2FactorKgPerKwh: optNum(i.co2FactorKgPerKwh),
        currency: optStr(i.currency),
      };
      requireUpdate(a);
      return a;
    },
    preview: async (a) => {
      const parts: string[] = [];
      if (a.systemSizeKwp !== undefined) parts.push(`size ${a.systemSizeKwp} kWp`);
      if (a.batteryKwh !== undefined) parts.push(`battery ${a.batteryKwh} kWh`);
      if (a.installCost !== undefined) parts.push(`install cost ${taka(a.installCost)}`);
      if (a.installDate !== undefined) parts.push(`install date ${a.installDate}`);
      if (a.latitude !== undefined || a.longitude !== undefined)
        parts.push(`location ${a.latitude ?? "?"}, ${a.longitude ?? "?"}`);
      if (a.co2FactorKgPerKwh !== undefined) parts.push(`CO2 factor ${a.co2FactorKgPerKwh}`);
      if (a.currency !== undefined) parts.push(`currency ${a.currency}`);
      return `Update solar settings — ${parts.join(", ")}.`;
    },
    commit: async (a) => {
      const data = await updateSolarSettings(a);
      return { summary: "Updated solar settings.", data };
    },
  }),

  write({
    name: "add_electricity_tariff",
    description:
      "Add a new effective-dated electricity tariff version (e.g. a BPDB government revision). Slabs are " +
      "cumulative bands over the month (0–50, 51–75, …); the top band has toUnit = null. The tariff in " +
      "force for any month is the latest one whose effectiveFrom is on/before it.",
    parameters: schema(
      {
        name: Str('Tariff name, e.g. "BPDB Residential — from June 2026"'),
        effectiveFrom: Str("Month it takes effect, YYYY-MM (or YYYY-MM-DD)"),
        distributor: Str("Distributor, e.g. BPDB (optional)"),
        demandCharge: Num("Flat monthly demand/service charge in BDT (optional, default 0)"),
        vatPercent: Num("VAT percent applied to energy + demand (optional, default 5)"),
        slabs: {
          type: "array",
          description: "Slab bands, ascending. Top band uses toUnit = null (unbounded).",
          items: {
            type: "object",
            properties: {
              fromUnit: Int("Inclusive lower bound in kWh, e.g. 0, 51, 76"),
              toUnit: Int("Inclusive upper bound in kWh; null/omit for the top band"),
              rate: Num("BDT per kWh"),
            },
            required: ["fromUnit", "rate"],
          },
        },
      },
      ["name", "effectiveFrom", "slabs"]
    ),
    parse: (i) => ({
      name: reqStr(i.name, "name"),
      effectiveFrom: reqStr(i.effectiveFrom, "effectiveFrom"),
      distributor: optStr(i.distributor),
      demandCharge: optNum(i.demandCharge),
      vatPercent: optNum(i.vatPercent),
      slabs: parseSlabs(i.slabs),
    }),
    preview: async (a) =>
      `Add tariff "${a.name}" (${a.distributor ?? "BPDB"}) effective ${a.effectiveFrom}, ` +
      `${a.slabs.length} slab(s), VAT ${a.vatPercent ?? 5}%.`,
    commit: async (a) => {
      const data = await createTariff({
        name: a.name,
        effectiveFrom: a.effectiveFrom,
        distributor: a.distributor,
        demandCharge: a.demandCharge,
        vatPercent: a.vatPercent,
        slabs: a.slabs,
      });
      return { summary: `Added tariff "${a.name}".`, data };
    },
  }),
];
