// Money Manager — personal expense/income categories. Each category has a
// `kind` (INCOME | EXPENSE) which is the source of truth for savings bucketing.
import { db, type DbClient } from "@/lib/db";
import { MoneyCategoryKind } from "@prisma/client";
import type { MoneyCategoryRow } from "@/types";

export async function getCategories(
  opts: { kind?: MoneyCategoryKind } = {}
): Promise<MoneyCategoryRow[]> {
  const categories = await db.moneyCategory.findMany({
    where: { ...(opts.kind && { kind: opts.kind }) },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    include: { _count: { select: { entries: true } } },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    isActive: c.isActive,
    entryCount: c._count.entries,
  }));
}

export interface CreateCategoryInput {
  name: string;
  kind: MoneyCategoryKind;
  isActive?: boolean;
}

export async function createCategory(input: CreateCategoryInput) {
  return db.moneyCategory.create({
    data: { name: input.name, kind: input.kind, isActive: input.isActive ?? true },
  });
}

export interface UpdateCategoryInput {
  name?: string;
  kind?: MoneyCategoryKind;
  isActive?: boolean;
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  return db.moneyCategory.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.kind && { kind: input.kind }),
      ...(input.isActive != null && { isActive: input.isActive }),
    },
  });
}

export async function deleteCategory(id: string) {
  const count = await db.moneyEntry.count({ where: { categoryId: id } });
  if (count > 0) {
    return {
      deleted: false,
      error: `Category has ${count} entry(ies); reassign or delete those first.`,
    };
  }
  await db.moneyCategory.delete({ where: { id } });
  return { deleted: true };
}

/**
 * Find-or-create a category by (name, kind). Used by the CSV importer so rows
 * referencing a new category name don't fail. The DB has a @@unique([name, kind]).
 * Pass `client` to enlist the find-or-create in the caller's transaction.
 */
export async function ensureCategory(
  name: string,
  kind: MoneyCategoryKind,
  client: DbClient = db
): Promise<string> {
  const existing = await client.moneyCategory.findUnique({
    where: { name_kind: { name, kind } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await client.moneyCategory.create({ data: { name, kind } });
  return created.id;
}

export interface MergeCategoriesInput {
  /** The duplicate being folded away — its entries are reassigned. */
  sourceId: string;
  /** The category that keeps the entries. */
  targetId: string;
  /** Delete the (now empty) source once its entries have moved. Default true. */
  deleteSource?: boolean;
}

export interface MergeCategoriesResult {
  movedEntries: number;
  sourceDeleted: boolean;
  sourceName: string;
  targetName: string;
}

/**
 * Fold one category into another: reassign every entry from `sourceId` to
 * `targetId`, then (by default) delete the emptied source. This is how a
 * duplicate category — "Groceries" imported twice, say — gets cleaned up
 * without touching the ledger rows themselves.
 *
 * Cross-kind merges are refused: `kind` is the source of truth for
 * income/expense bucketing, so moving a DEBIT entry under an INCOME category
 * would silently corrupt savings and the expense breakdown.
 *
 * The reassignment and the delete run in one transaction — a failed delete
 * must not leave the entries already moved.
 */
export async function mergeCategories(input: MergeCategoriesInput): Promise<MergeCategoriesResult> {
  const { sourceId, targetId, deleteSource = true } = input;
  if (!sourceId || !targetId) throw new Error("sourceId and targetId are required");
  if (sourceId === targetId) throw new Error("Pick a different category to merge into.");

  return db.$transaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.moneyCategory.findUnique({ where: { id: sourceId } }),
      tx.moneyCategory.findUnique({ where: { id: targetId } }),
    ]);
    if (!source) throw new Error("The category being merged no longer exists.");
    if (!target) throw new Error("The category to merge into no longer exists.");
    if (source.kind !== target.kind) {
      throw new Error(
        `Cannot merge a ${source.kind === "INCOME" ? "income" : "expense"} category into a ` +
          `${target.kind === "INCOME" ? "income" : "expense"} one — merge within the same kind.`
      );
    }

    const { count } = await tx.moneyEntry.updateMany({
      where: { categoryId: sourceId },
      data: { categoryId: targetId },
    });
    if (deleteSource) await tx.moneyCategory.delete({ where: { id: sourceId } });

    return {
      movedEntries: count,
      sourceDeleted: deleteSource,
      sourceName: source.name,
      targetName: target.name,
    };
  });
}
