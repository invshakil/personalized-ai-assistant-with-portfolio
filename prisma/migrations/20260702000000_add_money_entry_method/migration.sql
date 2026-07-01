-- CreateEnum
CREATE TYPE "MoneyEntryMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'MOBILE_BANKING', 'CHEQUE', 'OTHER');

-- AlterTable
ALTER TABLE "MoneyEntry" ADD COLUMN "method" "MoneyEntryMethod";
