import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/services/ai/crypto";
import {
  isDriveConfigured,
  getAccessToken,
  ensureFolder,
  uploadFile,
  deleteFile,
} from "./googleDrive";
import type {
  AdminBackupSettings,
  AdminBackupState,
  AdminBackupRecord,
  BackupFrequency,
} from "@/types";

const DUMP_MIME = "application/octet-stream";

function backupDir(): string {
  return process.env.BACKUP_DIR || path.join(process.cwd(), "backups");
}

// ─── Settings ─────────────────────────────────────────────────────────────────

/** The settings singleton row (creates it with defaults on first access). */
async function getSettingsRow() {
  return db.backupSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

function toPublicSettings(row: {
  frequency: string;
  retentionCount: number;
  lastRunAt: Date | null;
  lastStatus: string | null;
  lastError: string | null;
  driveConnected: boolean;
  driveEmail: string | null;
}): AdminBackupSettings {
  return {
    frequency: row.frequency as BackupFrequency,
    retentionCount: row.retentionCount,
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastStatus: (row.lastStatus as "ok" | "error" | null) ?? null,
    lastError: row.lastError,
    driveConnected: row.driveConnected,
    driveEmail: row.driveEmail,
  };
}

function toRecord(r: {
  id: string;
  filename: string;
  sizeBytes: number;
  location: string;
  driveFileId: string | null;
  trigger: string;
  status: string;
  error: string | null;
  createdAt: Date;
}): AdminBackupRecord {
  return {
    id: r.id,
    filename: r.filename,
    sizeBytes: r.sizeBytes,
    location: r.location as AdminBackupRecord["location"],
    driveFileId: r.driveFileId,
    trigger: r.trigger as AdminBackupRecord["trigger"],
    status: r.status as AdminBackupRecord["status"],
    error: r.error,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getBackupState(): Promise<AdminBackupState> {
  const [row, records] = await Promise.all([
    getSettingsRow(),
    db.backupRecord.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
  ]);
  return {
    settings: toPublicSettings(row),
    records: records.map(toRecord),
    driveConfigured: isDriveConfigured(),
  };
}

export async function updateBackupSettings(input: {
  frequency?: BackupFrequency;
  retentionCount?: number;
}): Promise<AdminBackupSettings> {
  const row = await db.backupSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(input.frequency && { frequency: input.frequency }),
      ...(input.retentionCount != null && {
        retentionCount: Math.max(1, Math.min(60, input.retentionCount)),
      }),
    },
    create: {
      id: "singleton",
      frequency: input.frequency ?? "off",
      retentionCount: input.retentionCount ?? 7,
    },
  });
  return toPublicSettings(row);
}

// ─── Google Drive connection (encrypted refresh token) ──────────────────────────

export async function saveDriveConnection(refreshToken: string, email: string): Promise<void> {
  const enc = encryptSecret(refreshToken);
  await db.backupSettings.upsert({
    where: { id: "singleton" },
    update: {
      driveConnected: true,
      driveEmail: email,
      driveTokenEnc: enc.enc,
      driveTokenIv: enc.iv,
      driveTokenTag: enc.tag,
    },
    create: {
      id: "singleton",
      driveConnected: true,
      driveEmail: email,
      driveTokenEnc: enc.enc,
      driveTokenIv: enc.iv,
      driveTokenTag: enc.tag,
    },
  });
}

export async function clearDriveConnection(): Promise<string | null> {
  const row = await getSettingsRow();
  const token = readRefreshToken(row);
  await db.backupSettings.update({
    where: { id: "singleton" },
    data: {
      driveConnected: false,
      driveEmail: null,
      driveFolderId: null,
      driveTokenEnc: null,
      driveTokenIv: null,
      driveTokenTag: null,
    },
  });
  return token; // caller may revoke it at Google
}

function readRefreshToken(row: {
  driveTokenEnc: string | null;
  driveTokenIv: string | null;
  driveTokenTag: string | null;
}): string | null {
  if (!row.driveTokenEnc || !row.driveTokenIv || !row.driveTokenTag) return null;
  return decryptSecret({ enc: row.driveTokenEnc, iv: row.driveTokenIv, tag: row.driveTokenTag });
}

// ─── pg_dump ────────────────────────────────────────────────────────────────────

function pgDump(filePath: string): Promise<void> {
  const url = new URL(process.env.DATABASE_URL ?? "");
  const env: NodeJS.ProcessEnv = { ...process.env };
  if (url.password) env.PGPASSWORD = decodeURIComponent(url.password);
  const sslmode = url.searchParams.get("sslmode");
  if (sslmode) env.PGSSLMODE = sslmode;

  const args = [
    "-h",
    url.hostname,
    "-p",
    url.port || "5432",
    "-U",
    decodeURIComponent(url.username),
    "-d",
    url.pathname.replace(/^\//, ""),
    "-F",
    "c", // custom format (compressed; restore with pg_restore)
    "--no-owner",
    "--no-privileges",
    "-f",
    filePath,
  ];

  return new Promise((resolve, reject) => {
    const proc = spawn("pg_dump", args, { env });
    let stderr = "";
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("error", (e) =>
      reject(
        new Error(
          (e as NodeJS.ErrnoException).code === "ENOENT"
            ? "pg_dump not found on PATH. Install PostgreSQL client tools on the server."
            : e.message
        )
      )
    );
    proc.on("close", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(stderr.trim() || `pg_dump exited with code ${code}`))
    );
  });
}

// ─── Run a backup ────────────────────────────────────────────────────────────────

/** Create a backup: pg_dump → local file → (optional) Drive upload → prune. */
export async function runBackup(
  trigger: "manual" | "scheduled" = "manual"
): Promise<{ ok: boolean; record?: AdminBackupRecord; error?: string }> {
  const dir = backupDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${stamp}.dump`;
  const filePath = path.join(dir, filename);

  try {
    await fs.mkdir(dir, { recursive: true });
    await pgDump(filePath);
    const { size } = await fs.stat(filePath);

    let location: AdminBackupRecord["location"] = "local";
    let driveFileId: string | null = null;

    const row = await getSettingsRow();
    if (row.driveConnected && isDriveConfigured()) {
      const refresh = readRefreshToken(row);
      if (refresh) {
        const accessToken = await getAccessToken(refresh);
        const folderId = await ensureFolder(accessToken, row.driveFolderId);
        if (folderId !== row.driveFolderId) {
          await db.backupSettings.update({
            where: { id: "singleton" },
            data: { driveFolderId: folderId },
          });
        }
        const buffer = await fs.readFile(filePath);
        driveFileId = await uploadFile(accessToken, folderId, filename, buffer, DUMP_MIME);
        location = "local+drive";
      }
    }

    const rec = await db.backupRecord.create({
      data: { filename, sizeBytes: size, location, driveFileId, trigger, status: "ok" },
    });
    await db.backupSettings.update({
      where: { id: "singleton" },
      data: { lastRunAt: new Date(), lastStatus: "ok", lastError: null },
    });

    await pruneBackups();
    return { ok: true, record: toRecord(rec) };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Backup failed";
    // Clean up a partial dump file if pg_dump failed mid-write.
    await fs.rm(filePath, { force: true }).catch(() => {});
    await db.backupRecord.create({
      data: { filename, sizeBytes: 0, location: "local", trigger, status: "error", error: message },
    });
    await db.backupSettings.update({
      where: { id: "singleton" },
      data: { lastRunAt: new Date(), lastStatus: "error", lastError: message },
    });
    return { ok: false, error: message };
  }
}

/** Keep the newest `retentionCount` successful backups; delete older files + rows. */
export async function pruneBackups(): Promise<void> {
  const row = await getSettingsRow();
  const keep = row.retentionCount;
  const succeeded = await db.backupRecord.findMany({
    where: { status: "ok" },
    orderBy: { createdAt: "desc" },
  });
  const stale = succeeded.slice(keep);
  if (stale.length === 0) {
    // Still clean up failed rows older than the newest 50 to avoid clutter.
    return;
  }

  let accessToken: string | null = null;
  const refresh = readRefreshToken(row);
  for (const r of stale) {
    await fs.rm(path.join(backupDir(), r.filename), { force: true }).catch(() => {});
    if (r.driveFileId && refresh && isDriveConfigured()) {
      try {
        accessToken ??= await getAccessToken(refresh);
        await deleteFile(accessToken, r.driveFileId);
      } catch {
        // best-effort — leave the Drive copy if deletion fails
      }
    }
    await db.backupRecord.delete({ where: { id: r.id } });
  }
}

export async function deleteBackup(id: string): Promise<void> {
  const rec = await db.backupRecord.findUnique({ where: { id } });
  if (!rec) return;
  await fs.rm(path.join(backupDir(), rec.filename), { force: true }).catch(() => {});
  if (rec.driveFileId && isDriveConfigured()) {
    const row = await getSettingsRow();
    const refresh = readRefreshToken(row);
    if (refresh) {
      try {
        await deleteFile(await getAccessToken(refresh), rec.driveFileId);
      } catch {
        // best-effort
      }
    }
  }
  await db.backupRecord.delete({ where: { id } });
}

/** Local file path + name for a record, if the local file still exists. */
export async function getLocalBackupFile(
  id: string
): Promise<{ path: string; filename: string } | null> {
  const rec = await db.backupRecord.findUnique({ where: { id } });
  if (!rec) return null;
  const filePath = path.join(backupDir(), rec.filename);
  try {
    await fs.access(filePath);
    return { path: filePath, filename: rec.filename };
  } catch {
    return null;
  }
}

/** Whether a scheduled run is due now, based on frequency + lastRunAt. */
export function isBackupDue(
  frequency: BackupFrequency,
  lastRunAt: Date | null,
  now: Date = new Date()
): boolean {
  if (frequency === "off") return false;
  if (!lastRunAt) return true;
  const elapsed = now.getTime() - lastRunAt.getTime();
  const day = 24 * 60 * 60 * 1000;
  return frequency === "daily" ? elapsed >= day : elapsed >= 7 * day;
}

/** Used by the scheduler tick: run a backup only if one is due. */
export async function runScheduledBackupIfDue(): Promise<void> {
  const row = await getSettingsRow();
  if (isBackupDue(row.frequency as BackupFrequency, row.lastRunAt)) {
    await runBackup("scheduled");
  }
}
