// Apply a hand-authored migration.sql to the LOCAL dev DB.
//
// Why this exists: the local DB was bootstrapped with `prisma db push`, so it
// has no `_prisma_migrations` baseline — `prisma migrate deploy` fails P3005 and
// `migrate dev` needs a TTY the tool shell doesn't have. So we run the SQL
// directly through the Prisma client. Deploy environments use `migrate deploy`.
//
// Usage: tsx scripts/apply-migration.ts <path-to-migration.sql>
// Idempotent: "already exists" errors are tolerated so re-runs are safe.
import { existsSync, readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

// ── Load env (DATABASE_URL) without a dotenv dependency (matches db-restore.ts) ──
function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnv(".env.local");
loadEnv(".env");

const db = new PrismaClient();

async function main() {
  const path =
    process.argv[2] ?? "prisma/migrations/20260618000000_add_money_manager/migration.sql";
  const raw = readFileSync(path, "utf8");

  // Strip `--` comment lines, then split into individual statements. None of our
  // statements contain a semicolon except as the terminator, so this is safe.
  const sql = raw
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  let applied = 0;
  let skipped = 0;
  for (const stmt of statements) {
    try {
      await db.$executeRawUnsafe(stmt);
      applied++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/already exists/i.test(msg)) {
        skipped++;
        continue;
      }
      console.error("\nFailed statement:\n", stmt, "\n");
      throw err;
    }
  }

  console.log(`Migration applied: ${applied} statement(s), ${skipped} skipped (already existed).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
