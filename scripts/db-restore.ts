/**
 * Restore the database from a pg_dump (custom-format) backup.
 *
 *   npm run db:restore -- <file-or-directory> [--yes] [--no-safety-backup] [--dry-run]
 *
 * Examples:
 *   npm run db:restore -- ./backups                       # latest .dump in ./backups
 *   npm run db:restore -- ./backups/backup-2026-...dump   # a specific file
 *   npm run db:restore -- ./backups --yes                 # skip the confirm prompt
 *   npm run db:restore -- ./backups --dry-run             # show what would run, do nothing
 *
 * Connection comes from DATABASE_URL (loaded from .env.local, then .env). This
 * REPLACES all data in the target database (pg_restore --clean --if-exists).
 */
import { spawn } from "node:child_process";
import { promises as fs, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

// ── Load env (DATABASE_URL) without a dotenv dependency ──
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

function fail(msg: string): never {
  console.error(`\n✗ ${msg}\n`);
  process.exit(1);
}

function confirm(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(question, (a) => (rl.close(), res(a.trim()))));
}

function run(cmd: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { env, stdio: "inherit" });
    proc.on("error", (e) =>
      reject(
        (e as NodeJS.ErrnoException).code === "ENOENT"
          ? new Error(`${cmd} not found on PATH. Install PostgreSQL client tools.`)
          : e
      )
    );
    proc.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`))
    );
  });
}

async function resolveDumpFile(input: string): Promise<string> {
  const stat = await fs.stat(input).catch(() => null);
  if (!stat) fail(`Path not found: ${input}`);
  if (stat.isDirectory()) {
    const entries = await fs.readdir(input);
    const dumps = entries.filter((f) => f.endsWith(".dump"));
    if (dumps.length === 0) fail(`No .dump files in directory: ${input}`);
    const withTime = await Promise.all(
      dumps.map(async (f) => ({ f, t: (await fs.stat(path.join(input, f))).mtimeMs }))
    );
    withTime.sort((a, b) => b.t - a.t);
    const latest = path.join(input, withTime[0].f);
    console.log(`Using latest dump in directory: ${withTime[0].f}`);
    return latest;
  }
  return input;
}

async function main() {
  loadEnv(path.resolve(".env.local"));
  loadEnv(path.resolve(".env"));

  const argv = process.argv.slice(2);
  const flags = new Set(argv.filter((a) => a.startsWith("-")));
  const positional = argv.find((a) => !a.startsWith("-"));
  const dryRun = flags.has("--dry-run");
  const skipConfirm = flags.has("--yes") || flags.has("-y");
  const safetyBackup = !flags.has("--no-safety-backup");

  if (!positional) {
    fail("Pass a dump file or a directory. e.g. npm run db:restore -- ./backups");
  }
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set (looked in .env.local and .env).");
  }

  const url = new URL(process.env.DATABASE_URL!);
  const conn = {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: url.password ? decodeURIComponent(url.password) : "",
    db: url.pathname.replace(/^\//, ""),
    sslmode: url.searchParams.get("sslmode") ?? undefined,
  };
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (conn.password) env.PGPASSWORD = conn.password;
  if (conn.sslmode) env.PGSSLMODE = conn.sslmode;

  const dumpFile = path.resolve(await resolveDumpFile(path.resolve(positional!)));

  console.log("\n── Database restore ──");
  console.log(`  Target DB : ${conn.db} @ ${conn.host}:${conn.port} (user ${conn.user})`);
  console.log(`  Dump file : ${dumpFile}`);
  console.log(`  Safety backup first: ${safetyBackup ? "yes" : "no"}`);
  console.log("  This REPLACES all data in the target database.\n");

  if (dryRun) {
    console.log("--dry-run: nothing executed.");
    console.log(
      `Would run: pg_restore --clean --if-exists --no-owner -h ${conn.host} -p ${conn.port} -U ${conn.user} -d ${conn.db} "${dumpFile}"`
    );
    return;
  }

  if (!skipConfirm) {
    const answer = await confirm(`Type the database name "${conn.db}" to proceed: `);
    if (answer !== conn.db) fail("Confirmation did not match. Aborted.");
  }

  // Safety backup of the current state before overwriting.
  if (safetyBackup) {
    const dir = path.resolve(process.env.BACKUP_DIR || "./backups");
    await fs.mkdir(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safetyFile = path.join(dir, `pre-restore-${stamp}.dump`);
    console.log(`\n→ Safety backup → ${safetyFile}`);
    await run(
      "pg_dump",
      [
        "-h",
        conn.host,
        "-p",
        conn.port,
        "-U",
        conn.user,
        "-d",
        conn.db,
        "-Fc",
        "--no-owner",
        "-f",
        safetyFile,
      ],
      env
    );
    console.log("  ✓ Safety backup done");
  }

  console.log(`\n→ Restoring ${path.basename(dumpFile)} …`);
  await run(
    "pg_restore",
    [
      "--clean",
      "--if-exists",
      "--no-owner",
      "-h",
      conn.host,
      "-p",
      conn.port,
      "-U",
      conn.user,
      "-d",
      conn.db,
      dumpFile,
    ],
    env
  );
  console.log("\n✓ Restore complete. Restart the app and sign in again.\n");
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
