// Money Manager — personal expense/income categories. Each category has a
// `kind` (INCOME | EXPENSE) which is the source of truth for savings bucketing.
import { db } from "@/lib/db";
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
 */
export async function ensureCategory(name: string, kind: MoneyCategoryKind): Promise<string> {
  const existing = await db.moneyCategory.findUnique({
    where: { name_kind: { name, kind } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.moneyCategory.create({ data: { name, kind } });
  return created.id;
}
