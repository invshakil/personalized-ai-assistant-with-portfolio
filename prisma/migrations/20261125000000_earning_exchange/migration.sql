-- Foreign→foreign exchange (e.g. EUR→USD): a pending earning is re-denominated
-- into the destination currency and stays pending. These columns remember the
-- pre-exchange values so the exchange can be undone.
ALTER TABLE "Earning"
  ADD COLUMN "exchangeEntryId" TEXT,
  ADD COLUMN "exchangedFromCurrency" TEXT,
  ADD COLUMN "exchangedFromAmount" DECIMAL(14,2),
  ADD COLUMN "exchangedFromFxRate" DECIMAL(18,6);

CREATE INDEX "Earning_exchangeEntryId_idx" ON "Earning"("exchangeEntryId");

ALTER TABLE "Earning"
  ADD CONSTRAINT "Earning_exchangeEntryId_fkey"
  FOREIGN KEY ("exchangeEntryId") REFERENCES "MoneyEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
