// Next.js instrumentation hook — runs once when the server process boots.
// Used to start the in-process database-backup scheduler. Node.js runtime only
// (skips the edge runtime, where child_process / fs aren't available).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startBackupScheduler } = await import("@/services/admin/backupScheduler");
  startBackupScheduler();
}
