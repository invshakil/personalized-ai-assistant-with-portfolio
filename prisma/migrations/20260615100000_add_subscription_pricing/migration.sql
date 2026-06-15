-- Effective-dated price changes for subscriptions (price hikes/drops).
CREATE TABLE "SubscriptionRateChange" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "effectiveMonth" TIMESTAMP(3) NOT NULL,
    "monthlyAmount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionRateChange_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionRateChange_subscriptionId_effectiveMonth_key" ON "SubscriptionRateChange"("subscriptionId", "effectiveMonth");
CREATE INDEX "SubscriptionRateChange_subscriptionId_idx" ON "SubscriptionRateChange"("subscriptionId");

ALTER TABLE "SubscriptionRateChange" ADD CONSTRAINT "SubscriptionRateChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Per-month final-amount overrides (discounts, coupons, free/partial months).
CREATE TABLE "SubscriptionMonthOverride" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SubscriptionMonthOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionMonthOverride_subscriptionId_month_key" ON "SubscriptionMonthOverride"("subscriptionId", "month");
CREATE INDEX "SubscriptionMonthOverride_subscriptionId_idx" ON "SubscriptionMonthOverride"("subscriptionId");

ALTER TABLE "SubscriptionMonthOverride" ADD CONSTRAINT "SubscriptionMonthOverride_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
