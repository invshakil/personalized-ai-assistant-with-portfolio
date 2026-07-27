-- Trip Expense Manager v2 — group trips: participants, per-expense splitting,
-- and settlements (collect fund / settle up). TripExpense is the source of truth
-- for shared costs; TripExpenseShare holds each participant's share; a linked
-- MoneyEntry is created only for self-paid, non-card, real-account expenses.

-- CreateEnum
CREATE TYPE "TripSplitMode" AS ENUM ('EQUAL', 'EXACT');

-- CreateTable
CREATE TABLE "TripParticipant" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isSelf" BOOLEAN NOT NULL DEFAULT false,
    "beneficiaryId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripExpense" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "description" TEXT,
    "category" "TripCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "amount" DECIMAL(12,2) NOT NULL,
    "fxRate" DECIMAL(18,6),
    "amountBdt" DECIMAL(14,2) NOT NULL,
    "payerId" TEXT NOT NULL,
    "splitMode" "TripSplitMode" NOT NULL DEFAULT 'EQUAL',
    "accountId" TEXT,
    "moneyEntryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripExpenseShare" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "amountBdt" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "TripExpenseShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSettlement" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "fromParticipantId" TEXT NOT NULL,
    "toParticipantId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "fxRate" DECIMAL(18,6),
    "amountBdt" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripParticipant_tripId_idx" ON "TripParticipant"("tripId");

-- CreateIndex
CREATE INDEX "TripParticipant_beneficiaryId_idx" ON "TripParticipant"("beneficiaryId");

-- CreateIndex
CREATE UNIQUE INDEX "TripExpense_moneyEntryId_key" ON "TripExpense"("moneyEntryId");

-- CreateIndex
CREATE INDEX "TripExpense_tripId_idx" ON "TripExpense"("tripId");

-- CreateIndex
CREATE INDEX "TripExpense_payerId_idx" ON "TripExpense"("payerId");

-- CreateIndex
CREATE INDEX "TripExpense_accountId_idx" ON "TripExpense"("accountId");

-- CreateIndex
CREATE INDEX "TripExpenseShare_expenseId_idx" ON "TripExpenseShare"("expenseId");

-- CreateIndex
CREATE INDEX "TripExpenseShare_participantId_idx" ON "TripExpenseShare"("participantId");

-- CreateIndex
CREATE UNIQUE INDEX "TripExpenseShare_expenseId_participantId_key" ON "TripExpenseShare"("expenseId", "participantId");

-- CreateIndex
CREATE INDEX "TripSettlement_tripId_idx" ON "TripSettlement"("tripId");

-- AddForeignKey
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripParticipant" ADD CONSTRAINT "TripParticipant_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "TripParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpense" ADD CONSTRAINT "TripExpense_moneyEntryId_fkey" FOREIGN KEY ("moneyEntryId") REFERENCES "MoneyEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpenseShare" ADD CONSTRAINT "TripExpenseShare_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "TripExpense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripExpenseShare" ADD CONSTRAINT "TripExpenseShare_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TripParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSettlement" ADD CONSTRAINT "TripSettlement_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSettlement" ADD CONSTRAINT "TripSettlement_fromParticipantId_fkey" FOREIGN KEY ("fromParticipantId") REFERENCES "TripParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSettlement" ADD CONSTRAINT "TripSettlement_toParticipantId_fkey" FOREIGN KEY ("toParticipantId") REFERENCES "TripParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
