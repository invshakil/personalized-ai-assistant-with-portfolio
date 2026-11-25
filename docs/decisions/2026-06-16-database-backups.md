# Database backups

**The database is backed up on a schedule with `pg_dump`, with an optional offsite copy in the owner's own Google Drive, and restore is guided, not run from the browser** (Shakil, 16 Jun 2026).

- **Why restore is guided:** it is destructive.
- **Instead of:** the `googleapis` package. Drive is called with plain `fetch` against Google OAuth and the Drive REST API, so no new dependency was added.

What was added (Settings → Backups, `/admin/settings/backup`):

- New `BackupSettings` and `BackupRecord` models and a migration.
- The runner, `services/admin/backup.ts`: `pg_dump` in custom format, written to the local `BACKUP_DIR`, then an optional Drive upload, then retention pruning of both local and Drive copies. It fails gracefully if `pg_dump` is missing.
- Drive through OAuth to the admin's own account, in `services/admin/googleDrive.ts`. The scope is `drive.file`. The refresh token is AES-256-GCM encrypted, reusing `ai/crypto`.
- An in-process scheduler started from `instrumentation.ts`: a 30-minute tick that runs a backup when one is due by frequency and `lastRunAt`.
- Routes: `/api/admin/backup` (GET, PUT, POST), `/backup/[id]` (download, DELETE), and `/backup/google/start`, `callback` and `disconnect`.
- The page: frequency and retention, Connect Drive, Backup now, and a list with download and delete.
- `.env.example` and the environment table were updated. `/backups/` and `*.dump` are git-ignored.

Restore:

- Each backup has a Restore dialog that shows the exact `pg_restore` command with the real server path, and the safety steps: take a fresh backup, stop the app, restore, restart, sign in again.
- Download falls back to streaming from Drive when the local copy is gone (`googleDrive.downloadFile`). `backupDir` and `databaseName` are exposed on the state for this.
- `npm run db:restore -- <file-or-directory>` (`scripts/db-restore.ts`) does the same from the command line. It reads `DATABASE_URL`, accepts a file or a directory (it picks the newest `.dump`), asks for the database name to confirm, takes a safety backup first, then runs `pg_restore`. Flags: `--yes`, `--no-safety-backup`, `--dry-run`.

The server needs the `pg_dump` and `pg_restore` binaries. `PG_BIN_DIR` points to them when they are not on PATH.

Verified: build and lint clean. Settings create, read and update, the due logic and the missing-`pg_dump` path were run locally. `pg_dump` was not available in that environment, so the full dump and upload were verified on the droplet.
