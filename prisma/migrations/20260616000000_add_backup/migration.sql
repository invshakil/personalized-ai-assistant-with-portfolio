-- Database backup configuration singleton (+ encrypted Drive refresh token).
CREATE TABLE "BackupSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "frequency" TEXT NOT NULL DEFAULT 'off',
    "retentionCount" INTEGER NOT NULL DEFAULT 7,
    "lastRunAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "lastError" TEXT,
    "driveConnected" BOOLEAN NOT NULL DEFAULT false,
    "driveEmail" TEXT,
    "driveFolderId" TEXT,
    "driveTokenEnc" TEXT,
    "driveTokenIv" TEXT,
    "driveTokenTag" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BackupSettings_pkey" PRIMARY KEY ("id")
);

-- One row per backup attempt.
CREATE TABLE "BackupRecord" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT NOT NULL DEFAULT 'local',
    "driveFileId" TEXT,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'ok',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BackupRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BackupRecord_createdAt_idx" ON "BackupRecord"("createdAt");
