-- Phase 0 of the AI feature-integration plan.
--
-- 1. AiUsage.feature — attribute token spend to the product surface that spent
--    it. Existing rows are all chat turns (the chat route was the only caller),
--    so the DEFAULT backfills them correctly.
-- 2. AiProposedAction — persist the propose→approve→commit gate so an approval
--    card survives a reload and so non-chat surfaces can use the same gate.

ALTER TABLE "AiUsage" ADD COLUMN "feature" TEXT NOT NULL DEFAULT 'chat';

CREATE INDEX "AiUsage_feature_createdAt_idx" ON "AiUsage"("feature", "createdAt");

CREATE TABLE "AiProposedAction" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL,
    "sessionId" TEXT,
    "tool" TEXT NOT NULL,
    "input" JSONB NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result" TEXT,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "AiProposedAction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiProposedAction_status_createdAt_idx" ON "AiProposedAction"("status", "createdAt");
CREATE INDEX "AiProposedAction_sessionId_idx" ON "AiProposedAction"("sessionId");

ALTER TABLE "AiProposedAction" ADD CONSTRAINT "AiProposedAction_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
