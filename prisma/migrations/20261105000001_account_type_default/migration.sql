-- One account per type can be the picker default (Bank → UCB Bank).
ALTER TABLE "MoneyAccount" ADD COLUMN "isTypeDefault" BOOLEAN NOT NULL DEFAULT false;
