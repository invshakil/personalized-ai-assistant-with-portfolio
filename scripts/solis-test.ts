// SolisCloud connection test. Verifies request signing against your real
// account and prints your station/inverter IDs plus a sample inverterDetail
// payload — the source of truth for field names used in fieldMap.ts.
//
//   npm run solis:test
//
// Reads credentials from .env.local / .env (SOLIS_KEY_ID/SECRET/URL). Read-only.
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Load env from .env.local then .env (first wins) — tsx doesn't do this for us.
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    let text: string;
    try {
      text = readFileSync(join(process.cwd(), file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

async function main() {
  loadEnv();
  const { userStationList, inverterList, inverterDetail, stationDetail } =
    await import("../src/services/solis/client");
  const { mapStations, mapInverters, dailyFromInverterDetail } =
    await import("../src/services/solis/fieldMap");

  console.log("1. userStationList …");
  const stationsData = await userStationList();
  const stations = mapStations(stationsData);
  console.log(`   → ${stations.length} station(s):`);
  stations.forEach((s) =>
    console.log(
      `     • ${s.name} (id=${s.id}, capacity=${s.capacityKwp ?? "?"} kWp, ` +
        `lat=${s.latitude ?? "?"}, lng=${s.longitude ?? "?"})`
    )
  );
  if (stations.length === 0) {
    console.log("   No stations returned — check the account / credentials.");
    return;
  }

  const station = stations[0];
  console.log(`\n2. stationDetail (${station.id}) …`);
  console.log(JSON.stringify(await stationDetail(station.id), null, 2).slice(0, 1500));

  console.log(`\n3. inverterList (station ${station.id}) …`);
  const inverters = mapInverters(await inverterList({ stationId: station.id }));
  console.log(`   → ${inverters.length} inverter(s):`);
  inverters.forEach((iv) => console.log(`     • ${iv.name} (sn=${iv.sn}, id=${iv.id})`));
  if (inverters.length === 0) return;

  const inv = inverters[0];
  const today = new Date().toISOString().slice(0, 10);
  console.log(`\n4. inverterDetail (sn=${inv.sn}) — RAW (verify field names here):`);
  const detail = await inverterDetail({ id: inv.id, sn: inv.sn });
  console.log(JSON.stringify(detail, null, 2));

  console.log(`\n5. Normalized daily energy for ${today} (from the above):`);
  console.log(JSON.stringify(dailyFromInverterDetail(detail, inv.sn, today), null, 2));
}

main().catch((e) => {
  console.error("\nSolis test failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
