-- Realized-basis foreign income. A foreign Earning is "pending" (realizedAt NULL)
-- and NOT counted in the BDT P&L until converted; on conversion these capture the
-- ACTUAL BDT received at the real rate, booked in the conversion period. BDT
-- earnings (incl. all 212 historical rows) are realized-on-earn so reports treat
-- them identically. `amount` keeps its meaning (indicative BDT at earn time).
-- Idempotent (IF NOT EXISTS); inline REFERENCES so the local apply-migration.ts
-- splitter (no DO $$ blocks) handles it, and valid for prod `migrate deploy`.

ALTER TABLE "Earning" ADD COLUMN IF NOT EXISTS "realizedAt" TIMESTAMP(3);
ALTER TABLE "Earning" ADD COLUMN IF NOT EXISTS "realizedAmount" DECIMAL(14,2);
ALTER TABLE "Earning" ADD COLUMN IF NOT EXISTS "realizedRate" DECIMAL(18,6);
ALTER TABLE "Earning" ADD COLUMN IF NOT EXISTS "transferEntryId" TEXT REFERENCES "MoneyEntry"("id") ON DELETE SET NULL;

-- BDT rows realize on earn: book amount at the earn date, identity rate. Foreign
-- rows stay NULL = pending conversion.
UPDATE "Earning"
   SET "realizedAt" = "date", "realizedAmount" = "amount", "realizedRate" = 1
 WHERE "currency" = 'BDT' AND "realizedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Earning_realizedAt_idx" ON "Earning"("realizedAt");
