-- Many-to-many: a salary payment can be attributed to multiple clients (IncomeSource).
-- Implicit Prisma relation "PaymentClients": A = EmployeePayment, B = IncomeSource.

-- CreateTable
CREATE TABLE "_PaymentClients" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PaymentClients_AB_unique" ON "_PaymentClients"("A", "B");

-- CreateIndex
CREATE INDEX "_PaymentClients_B_index" ON "_PaymentClients"("B");

-- AddForeignKey
ALTER TABLE "_PaymentClients" ADD CONSTRAINT "_PaymentClients_A_fkey" FOREIGN KEY ("A") REFERENCES "EmployeePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PaymentClients" ADD CONSTRAINT "_PaymentClients_B_fkey" FOREIGN KEY ("B") REFERENCES "IncomeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
