-- Multi-currency: Financial Tracker (Earning, EmployeePayment) + Money Manager
-- (MoneyAccount, MoneyEntry) + an FxRate cache. `amount` stays BDT-canonical
-- everywhere; new columns capture the original currency/amount/rate. All
-- statements are idempotent (IF NOT EXISTS) so they are safe to re-run and
-- valid for `prisma migrate deploy` on a fresh prod DB.

-- Financial Tracker — Earning: original-currency columns (amount = BDT canonical)
ALTER TABLE "Earning" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BDT';
ALTER TABLE "Earning" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(14,2);
ALTER TABLE "Earning" ADD COLUMN IF NOT EXISTS "fxRate" DECIMAL(18,6) NOT NULL DEFAULT 1;

-- Financial Tracker — EmployeePayment: same three columns
ALTER TABLE "EmployeePayment" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BDT';
ALTER TABLE "EmployeePayment" ADD COLUMN IF NOT EXISTS "originalAmount" DECIMAL(14,2);
ALTER TABLE "EmployeePayment" ADD COLUMN IF NOT EXISTS "fxRate" DECIMAL(18,6) NOT NULL DEFAULT 1;

-- Backfill historical rows: original = BDT amount, rate already defaulted to 1
UPDATE "Earning" SET "originalAmount" = "amount" WHERE "originalAmount" IS NULL;
UPDATE "EmployeePayment" SET "originalAmount" = "amount" WHERE "originalAmount" IS NULL;

-- Money Manager — MoneyAccount: per-account currency
ALTER TABLE "MoneyAccount" ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'BDT';

-- Money Manager — MoneyEntry: destination amount + captured rate
ALTER TABLE "MoneyEntry" ADD COLUMN IF NOT EXISTS "toAmount" DECIMAL(14,2);
ALTER TABLE "MoneyEntry" ADD COLUMN IF NOT EXISTS "fxRate" DECIMAL(18,6);

-- Backfill: all legacy rows are BDT, identity rate; transfers move the same
-- amount on both sides. Keeps balance math identical to pre-migration.
UPDATE "MoneyEntry" SET "fxRate" = 1 WHERE "fxRate" IS NULL;
UPDATE "MoneyEntry" SET "toAmount" = "amount" WHERE "direction" = 'TRANSFER' AND "toAmount" IS NULL;

-- FX rate cache (base always BDT)
CREATE TABLE IF NOT EXISTS "FxRate" (
  "id" TEXT NOT NULL,
  "base" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "rate" DECIMAL(18,6) NOT NULL,
  "asOf" TIMESTAMP(3) NOT NULL,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "FxRate_base_quote_asOf_key" ON "FxRate"("base", "quote", "asOf");
CREATE INDEX IF NOT EXISTS "FxRate_base_quote_fetchedAt_idx" ON "FxRate"("base", "quote", "fetchedAt");
