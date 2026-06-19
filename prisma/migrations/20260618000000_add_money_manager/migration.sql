-- CreateEnum
CREATE TYPE "MoneyEntryDirection" AS ENUM ('CREDIT', 'DEBIT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MoneyAccountType" AS ENUM ('CASH', 'BANK', 'MOBILE_WALLET', 'CREDIT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "MoneyCategoryKind" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ObligationType" AS ENUM ('RECURRING', 'LOAN');

-- CreateEnum
CREATE TYPE "ObligationDirection" AS ENUM ('OWED_TO_ME', 'OWED_BY_ME');

-- CreateEnum
CREATE TYPE "ObligationStatus" AS ENUM ('ACTIVE', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MoneyEntrySource" AS ENUM ('MANUAL', 'IMPORTED');

-- CreateTable
CREATE TABLE "MoneyAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MoneyAccountType" NOT NULL,
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "creditLimit" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "MoneyCategoryKind" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BeneficiaryObligation" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "type" "ObligationType" NOT NULL,
    "direction" "ObligationDirection" NOT NULL DEFAULT 'OWED_BY_ME',
    "amount" DECIMAL(12,2) NOT NULL,
    "frequency" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "ObligationStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeneficiaryObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "direction" "MoneyEntryDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BDT',
    "categoryId" TEXT,
    "accountId" TEXT,
    "transferAccountId" TEXT,
    "beneficiaryId" TEXT,
    "obligationId" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "source" "MoneyEntrySource" NOT NULL DEFAULT 'MANUAL',
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoneyImportBatch" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "mapping" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MoneyCategory_name_kind_key" ON "MoneyCategory"("name", "kind");

-- CreateIndex
CREATE INDEX "BeneficiaryObligation_beneficiaryId_idx" ON "BeneficiaryObligation"("beneficiaryId");

-- CreateIndex
CREATE INDEX "BeneficiaryObligation_status_idx" ON "BeneficiaryObligation"("status");

-- CreateIndex
CREATE INDEX "MoneyEntry_date_idx" ON "MoneyEntry"("date");

-- CreateIndex
CREATE INDEX "MoneyEntry_direction_date_idx" ON "MoneyEntry"("direction", "date");

-- CreateIndex
CREATE INDEX "MoneyEntry_categoryId_idx" ON "MoneyEntry"("categoryId");

-- CreateIndex
CREATE INDEX "MoneyEntry_accountId_idx" ON "MoneyEntry"("accountId");

-- CreateIndex
CREATE INDEX "MoneyEntry_beneficiaryId_idx" ON "MoneyEntry"("beneficiaryId");

-- CreateIndex
CREATE INDEX "MoneyEntry_obligationId_idx" ON "MoneyEntry"("obligationId");

-- CreateIndex
CREATE INDEX "MoneyEntry_importBatchId_idx" ON "MoneyEntry"("importBatchId");

-- AddForeignKey
ALTER TABLE "BeneficiaryObligation" ADD CONSTRAINT "BeneficiaryObligation_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MoneyCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_transferAccountId_fkey" FOREIGN KEY ("transferAccountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "BeneficiaryObligation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "MoneyImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
