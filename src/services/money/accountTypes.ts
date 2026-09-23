// Money Manager — user-managed account types ("Cash", "Bank", "bKash"…).
//
// Each type maps to one fixed `kind` (the MoneyAccountType enum), which is what
// behaviour keys off — credit limits, trip posting rules. The kind is set at
// creation and never changes, so the kind snapshot stored on MoneyAccount.type
// cannot drift from the type it belongs to.
//
// Archiving a type (isActive = false) hides it, and every account under it,
// from all pickers. Nothing is deleted and history is untouched; reactivating
// brings both back.
import { db, type DbClient } from "@/lib/db";
import { MoneyAccountType } from "@prisma/client";
import type { AccountTypeRow } from "@/types";

const NAME_MAX = 60;

export async function listAccountTypes(): Promise<AccountTypeRow[]> {
  const rows = await db.accountType.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { accounts: true } } },
  });
  return rows.map((t) => ({
    id: t.id,
    name: t.name,
    kind: t.kind,
    isActive: t.isActive,
    sortOrder: t.sortOrder,
    accountCount: t._count.accounts,
  }));
}

function cleanName(name: unknown): string {
  const n = typeof name === "string" ? name.trim() : "";
  if (!n) throw new Error("Name is required");
  if (n.length > NAME_MAX) throw new Error(`Name must be ${NAME_MAX} characters or fewer`);
  return n;
}

async function assertNameFree(name: string, exceptId?: string) {
  const clash = await db.accountType.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      ...(exceptId && { id: { not: exceptId } }),
    },
    select: { id: true },
  });
  if (clash) throw new Error(`An account type named "${name}" already exists`);
}

export interface CreateAccountTypeInput {
  name: string;
  kind: MoneyAccountType;
}

export async function createAccountType(input: CreateAccountTypeInput) {
  const name = cleanName(input.name);
  if (!(input.kind in MoneyAccountType)) throw new Error("Invalid kind");
  await assertNameFree(name);
  const last = await db.accountType.aggregate({ _max: { sortOrder: true } });
  return db.accountType.create({
    data: { name, kind: input.kind, sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
}

export interface UpdateAccountTypeInput {
  name?: string;
  isActive?: boolean;
  sortOrder?: number;
  /** Rejected if it differs — see the file header. */
  kind?: MoneyAccountType;
}

export async function updateAccountType(id: string, input: UpdateAccountTypeInput) {
  const current = await db.accountType.findUnique({ where: { id } });
  if (!current) throw new Error("Account type not found");
  if (input.kind && input.kind !== current.kind) {
    throw new Error("An account type's kind can't be changed — create a new type instead");
  }
  const name = input.name !== undefined ? cleanName(input.name) : undefined;
  if (name && name.toLowerCase() !== current.name.toLowerCase()) await assertNameFree(name, id);

  return db.accountType.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(input.isActive != null && { isActive: input.isActive }),
      ...(input.sortOrder != null && { sortOrder: input.sortOrder }),
    },
  });
}

export async function deleteAccountType(id: string) {
  const count = await db.moneyAccount.count({ where: { accountTypeId: id } });
  if (count > 0) {
    return {
      deleted: false as const,
      error: `${count} account(s) use this type; archive it instead.`,
    };
  }
  await db.accountType.delete({ where: { id } });
  return { deleted: true as const };
}

/**
 * The type a new or re-typed account lands on. An explicit `accountTypeId`
 * must exist and be active. A bare `kind` (the AI tool and older callers still
 * speak in kinds) resolves to the first active type of that kind.
 */
export async function resolveAccountType(
  input: { accountTypeId?: string | null; kind?: MoneyAccountType | null },
  client: DbClient = db
): Promise<{ id: string; kind: MoneyAccountType }> {
  if (input.accountTypeId) {
    const t = await client.accountType.findUnique({ where: { id: input.accountTypeId } });
    if (!t) throw new Error("Account type not found");
    if (!t.isActive) throw new Error(`Account type "${t.name}" is archived — reactivate it first`);
    return { id: t.id, kind: t.kind };
  }
  if (input.kind) {
    const t = await client.accountType.findFirst({
      where: { kind: input.kind, isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    if (!t) throw new Error(`No active account type of kind ${input.kind}`);
    return { id: t.id, kind: t.kind };
  }
  throw new Error("Account type is required");
}
