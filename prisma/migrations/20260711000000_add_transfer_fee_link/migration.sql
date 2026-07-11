-- AlterTable
ALTER TABLE "MoneyEntry" ADD COLUMN     "feeForTransferId" TEXT;

-- CreateIndex
CREATE INDEX "MoneyEntry_feeForTransferId_idx" ON "MoneyEntry"("feeForTransferId");

-- AddForeignKey
ALTER TABLE "MoneyEntry" ADD CONSTRAINT "MoneyEntry_feeForTransferId_fkey" FOREIGN KEY ("feeForTransferId") REFERENCES "MoneyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

