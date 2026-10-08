// Prunes old log rows. Started once from instrumentation.ts; guarded against
// duplicate timers (HMR in dev).
import { purgeLogs } from "./logs";

const RETENTION_DAYS = Number(process.env.LOG_RETENTION_DAYS) || 30;
const TICK_MS = 6 * 60 * 60 * 1000;

const g = globalThis as unknown as { __logRetentionStarted?: boolean };

async function tick() {
  try {
    await purgeLogs(RETENTION_DAYS);
  } catch {
    // Table missing / DB down — nothing useful to log to.
  }
}

export function startLogRetention(): void {
  if (g.__logRetentionStarted) return;
  g.__logRetentionStarted = true;
  setTimeout(tick, 2 * 60 * 1000);
  setInterval(tick, TICK_MS);
}
