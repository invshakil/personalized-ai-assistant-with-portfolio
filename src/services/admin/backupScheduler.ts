// In-process backup scheduler. Started once from instrumentation.ts on server
// boot. A periodic tick reads BackupSettings and runs a backup when one is due
// (daily/weekly by lastRunAt) — so changing the interval in Settings takes
// effect without a restart. Guarded against overlapping runs and duplicate
// timers (HMR in dev).
import { runScheduledBackupIfDue } from "./backup";

const TICK_MS = 30 * 60 * 1000; // check every 30 minutes
const FIRST_CHECK_MS = 60 * 1000; // first check ~1 min after boot

const g = globalThis as unknown as {
  __backupSchedulerStarted?: boolean;
  __backupRunning?: boolean;
};

async function tick() {
  if (g.__backupRunning) return; // don't overlap a long-running dump
  g.__backupRunning = true;
  try {
    await runScheduledBackupIfDue();
  } catch (e) {
    console.error("[backup] scheduled run failed:", e);
  } finally {
    g.__backupRunning = false;
  }
}

export function startBackupScheduler(): void {
  if (g.__backupSchedulerStarted) return;
  g.__backupSchedulerStarted = true;
  setTimeout(tick, FIRST_CHECK_MS);
  setInterval(tick, TICK_MS);
  console.log("[backup] scheduler started");
}
