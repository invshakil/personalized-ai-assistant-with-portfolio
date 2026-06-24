// Solar starter seed — your system details + the two BPDB residential tariff
// versions (pre-June-2026 and the June-2026 BERC revision). Idempotent: system
// values are only filled when still at their defaults (won't clobber edits made
// in Settings → Solar), and tariffs are only created when none exist yet.
//
//   npm run seed:solar      (standalone)   ·   also runs as part of `npm run seed`
//
// Verify the slab rates against an actual bill — they're approximate defaults.
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[m[1]] = v;
  }
}

// System details you provided. systemSizeKwp is left unset so the kWp auto-fills
// from SolisCloud on the first sync; set it in Settings → Solar.
const INSTALL_COST = 580_000; // BDT
const BATTERY_KWH = 16;
const INSTALL_DATE = new Date(Date.UTC(2026, 2, 13)); // 13 March 2026 — payback start

interface Slab {
  fromUnit: number;
  toUnit: number | null;
  rate: number;
}

const BPDB_PRE_JUNE_2026: Slab[] = [
  { fromUnit: 0, toUnit: 50, rate: 4.63 },
  { fromUnit: 51, toUnit: 75, rate: 5.26 },
  { fromUnit: 76, toUnit: 200, rate: 7.2 },
  { fromUnit: 201, toUnit: 300, rate: 7.59 },
  { fromUnit: 301, toUnit: 400, rate: 8.02 },
  { fromUnit: 401, toUnit: 600, rate: 12.67 },
  { fromUnit: 601, toUnit: null, rate: 14.61 },
];

const BPDB_FROM_JUNE_2026: Slab[] = [
  { fromUnit: 0, toUnit: 50, rate: 5.32 },
  { fromUnit: 51, toUnit: 75, rate: 5.72 },
  { fromUnit: 76, toUnit: 200, rate: 8.5 },
  { fromUnit: 201, toUnit: 300, rate: 9.1 },
  { fromUnit: 301, toUnit: 400, rate: 9.62 },
  { fromUnit: 401, toUnit: 600, rate: 15.01 },
  { fromUnit: 601, toUnit: null, rate: 17.35 },
];

async function seedSettings(db: PrismaClient) {
  const existing = await db.solarSettings.findUnique({ where: { id: "singleton" } });
  if (!existing) {
    await db.solarSettings.create({
      data: {
        id: "singleton",
        installCost: INSTALL_COST,
        batteryKwh: BATTERY_KWH,
        installDate: INSTALL_DATE,
        currency: "BDT",
      },
    });
    console.log(
      `  ✓ SolarSettings created (cost ৳${INSTALL_COST.toLocaleString()}, battery ${BATTERY_KWH} kWh, installed ${INSTALL_DATE.toISOString().slice(0, 10)}).`
    );
    return;
  }
  const data: { installCost?: number; batteryKwh?: number; installDate?: Date } = {};
  if (Number(existing.installCost) === 0) data.installCost = INSTALL_COST;
  if (existing.batteryKwh == null) data.batteryKwh = BATTERY_KWH;
  if (existing.installDate == null) data.installDate = INSTALL_DATE;
  if (Object.keys(data).length) {
    await db.solarSettings.update({ where: { id: "singleton" }, data });
    console.log(`  ✓ SolarSettings filled defaults: ${Object.keys(data).join(", ")}.`);
  } else {
    console.log("  • SolarSettings already customized — left as is.");
  }
}

async function seedTariffs(db: PrismaClient) {
  const count = await db.electricityTariff.count();
  if (count > 0) {
    console.log(`  • ${count} tariff(s) already present — skipping.`);
    return;
  }
  await db.electricityTariff.create({
    data: {
      name: "BPDB Residential — pre-June 2026",
      distributor: "BPDB",
      effectiveFrom: new Date(Date.UTC(2020, 0, 1)),
      vatPercent: 5,
      note: "Default rates — verify against your bill.",
      slabs: { create: BPDB_PRE_JUNE_2026 },
    },
  });
  await db.electricityTariff.create({
    data: {
      name: "BPDB Residential — from June 2026",
      distributor: "BPDB",
      effectiveFrom: new Date(Date.UTC(2026, 5, 1)),
      vatPercent: 5,
      note: "BERC June-2026 revision. Verify against your bill.",
      slabs: { create: BPDB_FROM_JUNE_2026 },
    },
  });
  console.log("  ✓ Seeded 2 BPDB tariff versions (pre-June-2026 + from-June-2026).");
}

/** Seed solar system settings + default BPDB tariffs. Idempotent. */
export async function seedSolar(db: PrismaClient): Promise<void> {
  console.log("→ Seeding solar settings + tariffs...");
  await seedSettings(db);
  await seedTariffs(db);
  console.log("✅ Solar seed complete.");
}

// Standalone runner — only executes when this file is run directly.
if (process.argv[1] && /seed-solar\.(ts|js)$/.test(process.argv[1])) {
  loadEnv(".env.local");
  loadEnv(".env");
  const db = new PrismaClient();
  seedSolar(db)
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => db.$disconnect());
}
