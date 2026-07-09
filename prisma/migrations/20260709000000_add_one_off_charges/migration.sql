-- CreateTable
CREATE TABLE "OneOffCharge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneOffCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OneOffCharge_tenantId_month_year_idx" ON "OneOffCharge"("tenantId", "month", "year");

-- AddForeignKey
ALTER TABLE "OneOffCharge" ADD CONSTRAINT "OneOffCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

