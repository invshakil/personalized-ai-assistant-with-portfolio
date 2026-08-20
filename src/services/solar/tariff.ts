// Electricity tariff engine — effective-dated, slab/tiered (BPDB residential).
//
// Bangladesh residential billing is cumulative over the month: the month's total
// units fall through the slab bands (0–50, 51–75, …). The tariff in force for a
// month is the version with the latest effectiveFrom <= that month — so a
// government revision is just a new tariff row. Cost = energy charge (slab) +
// demand/service charge + VAT.
import { db } from "@/lib/db";
import { toIso, toNum, money } from "./_serializers";

export interface TariffSlabInput {
  fromUnit: number;
  toUnit: number | null; // null = unbounded top slab
  rate: number; // BDT per kWh
}

export interface TariffSlabRow extends TariffSlabInput {
  id: string;
}

export interface TariffInput {
  name: string;
  distributor?: string;
  effectiveFrom: string; // "YYYY-MM-DD" or "YYYY-MM"
  demandCharge?: number; // flat monthly demand/service charge (BDT)
  vatPercent?: number;
  note?: string | null;
  slabs: TariffSlabInput[];
}

export interface TariffRow {
  id: string;
  name: string;
  distributor: string;
  effectiveFrom: string | null;
  demandCharge: number;
  vatPercent: number;
  note: string | null;
  slabs: TariffSlabRow[];
}

export interface BillSlabLine {
  fromUnit: number;
  toUnit: number | null;
  rate: number;
  units: number; // units billed in this band
  charge: number;
}

export interface BillBreakdown {
  units: number;
  energyCharge: number;
  demandCharge: number;
  vat: number;
  total: number;
  perSlab: BillSlabLine[];
}

/** Parse "YYYY-MM" / "YYYY-MM-DD" by literal components → 1st-of-month UTC. */
export function monthStartFromInput(input: string): Date {
  const [y, m] = input.split("-").map((n) => parseInt(n, 10));
  return new Date(Date.UTC(y, (m || 1) - 1, 1));
}

function sortSlabs<T extends { fromUnit: number }>(slabs: T[]): T[] {
  return [...slabs].sort((a, b) => a.fromUnit - b.fromUnit);
}

function rowToTariff(row: {
  id: string;
  name: string;
  distributor: string;
  effectiveFrom: Date;
  demandChargePerKw: { toNumber(): number };
  vatPercent: { toNumber(): number };
  note: string | null;
  slabs: { id: string; fromUnit: number; toUnit: number | null; rate: { toNumber(): number } }[];
}): TariffRow {
  return {
    id: row.id,
    name: row.name,
    distributor: row.distributor,
    effectiveFrom: toIso(row.effectiveFrom),
    demandCharge: toNum(row.demandChargePerKw),
    vatPercent: toNum(row.vatPercent),
    note: row.note,
    slabs: sortSlabs(
      row.slabs.map((s) => ({
        id: s.id,
        fromUnit: s.fromUnit,
        toUnit: s.toUnit,
        rate: toNum(s.rate),
      }))
    ),
  };
}

export async function listTariffs(): Promise<TariffRow[]> {
  const rows = await db.electricityTariff.findMany({
    orderBy: { effectiveFrom: "asc" },
    include: { slabs: true },
  });
  return rows.map(rowToTariff);
}

/** The tariff in force for the given month (latest effectiveFrom <= month). */
export async function getEffectiveTariff(month: Date): Promise<TariffRow | null> {
  const row = await db.electricityTariff.findFirst({
    where: { effectiveFrom: { lte: month } },
    orderBy: { effectiveFrom: "desc" },
    include: { slabs: true },
  });
  return row ? rowToTariff(row) : null;
}

/**
 * Compute a monthly bill for `units` kWh under `tariff`. Slabs are cumulative:
 * each band bills the units between the previous band's top and its own top.
 */
export function computeBill(units: number, tariff: TariffRow): BillBreakdown {
  const u = Math.max(0, units);
  const slabs = sortSlabs(tariff.slabs);
  let prevTop = 0;
  let energyCharge = 0;
  const perSlab: BillSlabLine[] = [];

  for (const slab of slabs) {
    const top = slab.toUnit ?? Number.POSITIVE_INFINITY;
    const bandUnits = Math.max(0, Math.min(u, top) - prevTop);
    const charge = bandUnits * slab.rate;
    if (bandUnits > 0 || slab.toUnit != null) {
      perSlab.push({
        fromUnit: slab.fromUnit,
        toUnit: slab.toUnit,
        rate: slab.rate,
        units: money(bandUnits),
        charge: money(charge),
      });
    }
    energyCharge += charge;
    prevTop = top;
    if (u <= top) break;
  }

  const demandCharge = tariff.demandCharge;
  const vat = ((energyCharge + demandCharge) * tariff.vatPercent) / 100;
  return {
    units: money(u),
    energyCharge: money(energyCharge),
    demandCharge: money(demandCharge),
    vat: money(vat),
    total: money(energyCharge + demandCharge + vat),
    perSlab,
  };
}

export async function createTariff(input: TariffInput): Promise<TariffRow> {
  const row = await db.electricityTariff.create({
    data: {
      name: input.name,
      distributor: input.distributor ?? "BPDB",
      effectiveFrom: monthStartFromInput(input.effectiveFrom),
      demandChargePerKw: input.demandCharge ?? 0,
      vatPercent: input.vatPercent ?? 5,
      note: input.note ?? null,
      slabs: {
        create: sortSlabs(input.slabs).map((s) => ({
          fromUnit: s.fromUnit,
          toUnit: s.toUnit,
          rate: s.rate,
        })),
      },
    },
    include: { slabs: true },
  });
  return rowToTariff(row);
}

export async function updateTariff(id: string, input: TariffInput): Promise<TariffRow> {
  // Replace slabs wholesale — simplest correct semantics for an edit. Atomic:
  // the delete used to be able to commit on its own, leaving a tariff with no
  // slabs at all if the update then failed — every bill silently costing 0.
  const row = await db.$transaction(async (tx) => {
    await tx.tariffSlab.deleteMany({ where: { tariffId: id } });
    return tx.electricityTariff.update({
      where: { id },
      data: {
        name: input.name,
        distributor: input.distributor ?? "BPDB",
        effectiveFrom: monthStartFromInput(input.effectiveFrom),
        demandChargePerKw: input.demandCharge ?? 0,
        vatPercent: input.vatPercent ?? 5,
        note: input.note ?? null,
        slabs: {
          create: sortSlabs(input.slabs).map((s) => ({
            fromUnit: s.fromUnit,
            toUnit: s.toUnit,
            rate: s.rate,
          })),
        },
      },
      include: { slabs: true },
    });
  });
  return rowToTariff(row);
}

export async function deleteTariff(id: string): Promise<{ deleted: true }> {
  await db.electricityTariff.delete({ where: { id } });
  return { deleted: true };
}

// BPDB residential (LT-A) slab rates, BDT/kWh. Approximate — the user verifies
// against an actual bill. The June-2026 BERC revision (~16.7% avg hike) is a
// separate effective-dated version. Values seeded only when no tariff exists.
const BPDB_PRE_JUNE_2026: TariffSlabInput[] = [
  { fromUnit: 0, toUnit: 50, rate: 4.63 },
  { fromUnit: 51, toUnit: 75, rate: 5.26 },
  { fromUnit: 76, toUnit: 200, rate: 7.2 },
  { fromUnit: 201, toUnit: 300, rate: 7.59 },
  { fromUnit: 301, toUnit: 400, rate: 8.02 },
  { fromUnit: 401, toUnit: 600, rate: 12.67 },
  { fromUnit: 601, toUnit: null, rate: 14.61 },
];

const BPDB_FROM_JUNE_2026: TariffSlabInput[] = [
  { fromUnit: 0, toUnit: 50, rate: 5.32 },
  { fromUnit: 51, toUnit: 75, rate: 5.72 },
  { fromUnit: 76, toUnit: 200, rate: 8.5 },
  { fromUnit: 201, toUnit: 300, rate: 9.1 },
  { fromUnit: 301, toUnit: 400, rate: 9.62 },
  { fromUnit: 401, toUnit: 600, rate: 15.01 },
  { fromUnit: 601, toUnit: null, rate: 17.35 },
];

/** Seeds the two BPDB tariff versions when none exist yet. Idempotent. */
export async function seedDefaultTariffsIfEmpty(): Promise<{ seeded: boolean }> {
  const count = await db.electricityTariff.count();
  if (count > 0) return { seeded: false };
  await createTariff({
    name: "BPDB Residential — pre-June 2026",
    effectiveFrom: "2020-01",
    vatPercent: 5,
    note: "Default rates — verify against your bill.",
    slabs: BPDB_PRE_JUNE_2026,
  });
  await createTariff({
    name: "BPDB Residential — from June 2026",
    effectiveFrom: "2026-06",
    vatPercent: 5,
    note: "BERC June-2026 revision. Verify against your bill.",
    slabs: BPDB_FROM_JUNE_2026,
  });
  return { seeded: true };
}
