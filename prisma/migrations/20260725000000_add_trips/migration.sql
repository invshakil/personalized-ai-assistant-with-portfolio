-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNING', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "TripCategory" AS ENUM ('FLIGHTS', 'ACCOMMODATION', 'FOOD', 'LOCAL_TRANSPORT', 'ACTIVITIES', 'SHOPPING', 'VISA_INSURANCE', 'MISC');

-- AlterTable
ALTER TABLE "MoneyEntry" ADD COLUMN "tripId" TEXT, ADD COLUMN "tripCategory" "TripCategory";

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "homeCurrency" TEXT NOT NULL DEFAULT 'BDT',
    "localCurrency" TEXT NOT NULL DEFAULT 'BDT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNING',
    "localWalletAccountId" TEXT,
    "notes" TEXT,
    "publicSlug" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "publicIntro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripBudget" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "category" "TripCategory" NOT NULL,
    "plannedAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Trip_publicSlug_key" ON "Trip"("publicSlug");

-- CreateIndex
CREATE INDEX "Trip_status_idx" ON "Trip"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TripBudget_tripId_category_key" ON "TripBudget"("tripId", "category");

-- CreateIndex
CREATE INDEX "TripBudget_tripId_idx" ON "TripBudget"("tripId");

-- CreateIndex
CREATE INDEX "MoneyEntry_tripId_idx" ON "MoneyEntry"("tripId");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_localWalletAccountId_fkey" FOREIGN KEY ("localWalletAccountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripBudget" ADD CONSTRAINT "TripBudget_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
