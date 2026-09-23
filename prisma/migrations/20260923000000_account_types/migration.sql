-- User-managed, archivable account types.
--
-- MoneyAccountType stays as the fixed *kind* (behaviour: credit-card limits,
-- trip posting rules). AccountType is the named list the user curates; each
-- account points at one. The five kinds are seeded as the starting types with
-- stable ids, and every existing account is backfilled onto the seed for its kind.

CREATE TABLE "AccountType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "MoneyAccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AccountType_name_key" ON "AccountType"("name");

INSERT INTO "AccountType" ("id", "name", "kind", "sortOrder", "updatedAt") VALUES
    ('acctype_cash',          'Cash',          'CASH',          1, CURRENT_TIMESTAMP),
    ('acctype_bank',          'Bank',          'BANK',          2, CURRENT_TIMESTAMP),
    ('acctype_mobile_wallet', 'Mobile wallet', 'MOBILE_WALLET', 3, CURRENT_TIMESTAMP),
    ('acctype_credit_card',   'Credit card',   'CREDIT_CARD',   4, CURRENT_TIMESTAMP),
    ('acctype_other',         'Other',         'OTHER',         5, CURRENT_TIMESTAMP);

ALTER TABLE "MoneyAccount" ADD COLUMN "accountTypeId" TEXT;

UPDATE "MoneyAccount" SET "accountTypeId" = CASE "type"
    WHEN 'CASH'          THEN 'acctype_cash'
    WHEN 'BANK'          THEN 'acctype_bank'
    WHEN 'MOBILE_WALLET' THEN 'acctype_mobile_wallet'
    WHEN 'CREDIT_CARD'   THEN 'acctype_credit_card'
    ELSE 'acctype_other'
END;

ALTER TABLE "MoneyAccount" ALTER COLUMN "accountTypeId" SET NOT NULL;

CREATE INDEX "MoneyAccount_accountTypeId_idx" ON "MoneyAccount"("accountTypeId");

ALTER TABLE "MoneyAccount" ADD CONSTRAINT "MoneyAccount_accountTypeId_fkey"
    FOREIGN KEY ("accountTypeId") REFERENCES "AccountType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
