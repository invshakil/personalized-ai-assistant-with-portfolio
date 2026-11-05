-- Prepaid AI credit tracking on the budget singleton (balance as of a date + expiry).
ALTER TABLE "AiBudget" ADD COLUMN "creditBalanceUsd" DECIMAL(10,2);
ALTER TABLE "AiBudget" ADD COLUMN "creditAsOf" TIMESTAMP(3);
ALTER TABLE "AiBudget" ADD COLUMN "creditExpiresAt" TIMESTAMP(3);
