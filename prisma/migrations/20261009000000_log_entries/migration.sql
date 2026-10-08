-- Application log browsed at /admin/logs.
CREATE TYPE "LogLevel" AS ENUM ('INFO', 'WARN', 'ERROR');

CREATE TABLE "LogEntry" (
    "id" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL,
    "source" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LogEntry_createdAt_idx" ON "LogEntry"("createdAt");
CREATE INDEX "LogEntry_level_createdAt_idx" ON "LogEntry"("level", "createdAt");
CREATE INDEX "LogEntry_source_createdAt_idx" ON "LogEntry"("source", "createdAt");
