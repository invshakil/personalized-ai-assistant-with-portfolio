// In-process SolisCloud sync scheduler. Started once from instrumentation.ts on
// server boot. A periodic tick syncs solar readings when due (every ~2h, see
// isSyncDue). Guarded against overlapping runs and duplicate timers (HMR in dev).
// No-ops when Solis credentials aren't set.
import { runScheduledSyncIfDue } from "./sync";

const TICK_MS = 60 * 60 * 1000; // check hourly
const FIRST_CHECK_MS = 90 * 1000; // first check ~1.5 min after boot

const g = globalThis as unknown as {
  __solisSchedulerStarted?: boolean;
  __solisRunning?: boolean;
};

async function tick() {
  if (g.__solisRunning) return; // don't overlap a sync
  g.__solisRunning = true;
  try {
    await runScheduledSyncIfDue();
  } catch (e) {
    console.error("[solis] scheduled sync failed:", e);
  } finally {
    g.__solisRunning = false;
  }
}

export function startSolisScheduler(): void {
  if (g.__solisSchedulerStarted) return;
  g.__solisSchedulerStarted = true;
  setTimeout(tick, FIRST_CHECK_MS);
  setInterval(tick, TICK_MS);
  console.log("[solis] scheduler started");
}
