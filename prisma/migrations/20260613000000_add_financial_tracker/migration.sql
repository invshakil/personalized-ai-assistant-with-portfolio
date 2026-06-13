-- CreateEnum
CREATE TYPE "RemittanceType" AS ENUM ('REM', 'NON_REM');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('SALARY', 'BONUS', 'ADVANCE', 'OTHER');

-- DropTable
DROP TABLE "Income";

-- DropEnum
DROP TYPE "IncomeCategory";

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomeSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizExpenseCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Earning" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "sourceId" TEXT NOT NULL,
    "remittance" "RemittanceType" NOT NULL DEFAULT 'NON_REM',
    "amount" DECIMAL(12,2) NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Earning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePayment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "PaymentKind" NOT NULL DEFAULT 'SALARY',
    "reference" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BizExpense" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "amount" DECIMAL(12,2) NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BizExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Employee_name_key" ON "Employee"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IncomeSource_name_key" ON "IncomeSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BizExpenseCategory_name_key" ON "BizExpenseCategory"("name");

-- CreateIndex
CREATE INDEX "Earning_fiscalYear_idx" ON "Earning"("fiscalYear");

-- CreateIndex
CREATE INDEX "Earning_sourceId_idx" ON "Earning"("sourceId");

-- CreateIndex
CREATE INDEX "EmployeePayment_fiscalYear_idx" ON "EmployeePayment"("fiscalYear");

-- CreateIndex
CREATE INDEX "EmployeePayment_employeeId_idx" ON "EmployeePayment"("employeeId");

-- CreateIndex
CREATE INDEX "BizExpense_fiscalYear_idx" ON "BizExpense"("fiscalYear");

-- AddForeignKey
ALTER TABLE "Earning" ADD CONSTRAINT "Earning_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "IncomeSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeePayment" ADD CONSTRAINT "EmployeePayment_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BizExpense" ADD CONSTRAINT "BizExpense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BizExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

