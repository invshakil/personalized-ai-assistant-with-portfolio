-- The Money account a property expense was paid from.
--
-- Replaces the free-text "Payment Mode": the account's type is the mode. The
-- old paymentMode column stays for rows recorded before this, shown as a
-- fallback. Nullable, and SET NULL on account delete, so history never blocks
-- removing an (unused) account.

ALTER TABLE "Expense" ADD COLUMN "accountId" TEXT;

CREATE INDEX "Expense_accountId_idx" ON "Expense"("accountId");

ALTER TABLE "Expense" ADD CONSTRAINT "Expense_accountId_fkey"
    FOREIGN KEY ("accountId") REFERENCES "MoneyAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
