// Next.js instrumentation hook — runs once when the server process boots.
// Starts the in-process schedulers (database backup + SolisCloud solar sync).
// Node.js runtime only (skips the edge runtime, where child_process / fs and
// our DB/network access aren't available).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // "Today", "this month" and fiscal boundaries are Bangladesh-local; a UTC
  // droplet would otherwise be ~6h behind. Override with TZ in the env.
  process.env.TZ ||= "Asia/Dhaka";
  const { startBackupScheduler } = await import("@/services/admin/backupScheduler");
  startBackupScheduler();
  const { startSolisScheduler } = await import("@/services/solis/scheduler");
  startSolisScheduler();
}
