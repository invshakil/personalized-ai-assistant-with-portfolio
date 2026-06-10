-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('CURRENT', 'FUTURE', 'PAST');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CASH', 'BANK_TRANSFER', 'ADVANCE_APPLIED', 'ADJUSTMENT', 'OTHER');

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_unitId_fkey";

-- DropForeignKey
ALTER TABLE "Tenant" DROP CONSTRAINT "Tenant_unitId_fkey";

-- DropIndex
DROP INDEX "Payment_unitId_month_year_key";

-- DropIndex
DROP INDEX "Tenant_unitId_key";

-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "expenseDate" TIMESTAMP(3),
ADD COLUMN     "paidTo" TEXT,
ADD COLUMN     "paymentMode" TEXT;

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount",
ADD COLUMN     "advanceApplied" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "carryForward" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "receiptNumber" TEXT,
ADD COLUMN     "rentDue" DECIMAL(10,2) NOT NULL,
ALTER COLUMN "unitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "advanceAmount" DECIMAL(10,2),
ADD COLUMN     "advancePaid" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "advanceSettled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isExternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "leaseEndDate" TIMESTAMP(3),
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "tenantCode" TEXT,
ADD COLUMN     "tenantStatus" "TenantStatus" NOT NULL DEFAULT 'CURRENT',
ALTER COLUMN "unitId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Unit" ADD COLUMN     "description" TEXT,
ALTER COLUMN "floor" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "PropertySettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "propertyName" TEXT NOT NULL DEFAULT 'Shakil Property',
    "ownerName" TEXT NOT NULL DEFAULT 'Md. Syful Islam Shakil',
    "ownerPhone" TEXT NOT NULL DEFAULT '',
    "address" TEXT NOT NULL DEFAULT 'Dhaka, Bangladesh',
    "bankAccount" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOnService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOnService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantService" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "monthlyFee" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RentChange" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "previousRent" DECIMAL(10,2) NOT NULL,
    "newRent" DECIMAL(10,2) NOT NULL,
    "reason" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RentChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "label" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AddOnService_name_key" ON "AddOnService"("name");

-- CreateIndex
CREATE UNIQUE INDEX "TenantService_tenantId_serviceId_key" ON "TenantService"("tenantId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_tenantId_month_year_key" ON "Payment"("tenantId", "month", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_tenantCode_key" ON "Tenant"("tenantCode");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantService" ADD CONSTRAINT "TenantService_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantService" ADD CONSTRAINT "TenantService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AddOnService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RentChange" ADD CONSTRAINT "RentChange_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantDocument" ADD CONSTRAINT "TenantDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
