// Money Manager — accounts (cash, bank, mobile wallet, credit card). Balances
// are derived purely from the ledger:
//   balance = openingBalance + Σ(CREDIT) − Σ(DEBIT) − Σ(TRANSFER-out) + Σ(TRANSFER-in)
// Asset accounts: positive = money held. Credit card: negative = owed;
// availableCredit = creditLimit + balance. Nothing is stored as a running total.
import { db } from "@/lib/db";
import { MoneyAccountType } from "@prisma/client";
import { toNum } from "./_serializers";
import type { MoneyAccountRow } from "@/types";

interface Flows {
  credit: number;
  debit: number;
  transferOut: number;
  transferIn: number;
}

/** Build a per-account flow map from the whole ledger (single grouped scan). */
async function accountFlows(): Promise<Map<string, Flows>> {
  const [byDir, transfersIn] = await Promise.all([
    db.moneyEntry.groupBy({
      by: ["accountId", "direction"],
      where: { accountId: { not: null } },
      _sum: { amount: true },
    }),
    db.moneyEntry.groupBy({
      by: ["transferAccountId"],
      where: { direction: "TRANSFER", transferAccountId: { not: null } },
      _sum: { amount: true },
    }),
  ]);

  const map = new Map<string, Flows>();
  const get = (id: string) =>
    map.get(id) ?? map.set(id, { credit: 0, debit: 0, transferOut: 0, transferIn: 0 }).get(id)!;

  for (const r of byDir) {
    if (!r.accountId) continue;
    const f = get(r.accountId);
    const amt = toNum(r._sum.amount);
    if (r.direction === "CREDIT") f.credit += amt;
    else if (r.direction === "DEBIT") f.debit += amt;
    else f.transferOut += amt; // TRANSFER leaving the source account
  }
  for (const r of transfersIn) {
    if (!r.transferAccountId) continue;
    get(r.transferAccountId).transferIn += toNum(r._sum.amount);
  }
  return map;
}

function balanceOf(openingBalance: number, f: Flows | undefined): number {
  if (!f) return openingBalance;
  return openingBalance + f.credit - f.debit - f.transferOut + f.transferIn;
}

export async function listAccountsWithBalances(): Promise<MoneyAccountRow[]> {
  const [accounts, flows] = await Promise.all([
    db.moneyAccount.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: { _count: { select: { entries: true } } },
    }),
    accountFlows(),
  ]);

  return accounts.map((a) => {
    const opening = toNum(a.openingBalance);
    const balance = balanceOf(opening, flows.get(a.id));
    const limit = a.creditLimit == null ? null : toNum(a.creditLimit);
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      openingBalance: opening,
      creditLimit: limit,
      isActive: a.isActive,
      notes: a.notes,
      balance,
      availableCredit: a.type === "CREDIT_CARD" && limit != null ? limit + balance : null,
      entryCount: a._count.entries,
    };
  });
}

/** Single-account balance (used by tools/CLI). */
export async function getAccountBalance(id: string): Promise<number> {
  const account = await db.moneyAccount.findUnique({
    where: { id },
    select: { openingBalance: true },
  });
  if (!account) throw new Error("Account not found");

  const [byDir, transferIn] = await Promise.all([
    db.moneyEntry.groupBy({
      by: ["direction"],
      where: { accountId: id },
      _sum: { amount: true },
    }),
    db.moneyEntry.aggregate({
      where: { direction: "TRANSFER", transferAccountId: id },
      _sum: { amount: true },
    }),
  ]);

  let balance = toNum(account.openingBalance);
  for (const r of byDir) {
    const amt = toNum(r._sum.amount);
    if (r.direction === "CREDIT") balance += amt;
    else balance -= amt; // DEBIT and TRANSFER-out both reduce the source
  }
  balance += toNum(transferIn._sum.amount);
  return balance;
}

export interface CreateAccountInput {
  name: string;
  type: MoneyAccountType;
  openingBalance?: number;
  creditLimit?: number | null;
  isActive?: boolean;
  notes?: string | null;
}

export async function createAccount(input: CreateAccountInput) {
  return db.moneyAccount.create({
    data: {
      name: input.name,
      type: input.type,
      openingBalance: input.openingBalance ?? 0,
      creditLimit: input.type === "CREDIT_CARD" ? (input.creditLimit ?? null) : null,
      isActive: input.isActive ?? true,
      notes: input.notes ?? null,
    },
  });
}

export interface UpdateAccountInput {
  name?: string;
  type?: MoneyAccountType;
  openingBalance?: number;
  creditLimit?: number | null;
  isActive?: boolean;
  notes?: string | null;
}

export async function updateAccount(id: string, input: UpdateAccountInput) {
  return db.moneyAccount.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.type && { type: input.type }),
      ...(input.openingBalance != null && { openingBalance: input.openingBalance }),
      ...(input.creditLimit !== undefined && { creditLimit: input.creditLimit }),
      ...(input.isActive != null && { isActive: input.isActive }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteAccount(id: string) {
  const count = await db.moneyEntry.count({
    where: { OR: [{ accountId: id }, { transferAccountId: id }] },
  });
  if (count > 0) {
    return {
      deleted: false,
      error: `Account is referenced by ${count} entry(ies); deactivate it instead.`,
    };
  }
  await db.moneyAccount.delete({ where: { id } });
  return { deleted: true };
}
