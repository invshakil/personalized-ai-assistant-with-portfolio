import { db } from "@/lib/db";
import { ExpenseCategory } from "@prisma/client";

export function getServiceTypes() {
  return db.propertyServiceType.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

export interface CreateServiceTypeInput {
  name: string;
  category: ExpenseCategory;
  description?: string | null;
}

export function createServiceType(input: CreateServiceTypeInput) {
  return db.propertyServiceType.create({
    data: {
      name: input.name,
      category: input.category,
      description: input.description ?? null,
    },
  });
}

export interface UpdateServiceTypeInput {
  name?: string;
  category?: ExpenseCategory;
  description?: string | null;
  isActive?: boolean;
}

export function updateServiceType(id: string, input: UpdateServiceTypeInput) {
  return db.propertyServiceType.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.category && { category: input.category }),
      ...(input.description !== undefined && { description: input.description ?? null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

/** Soft-delete: service types are deactivated, not removed. */
export async function deactivateServiceType(id: string) {
  await db.propertyServiceType.update({ where: { id }, data: { isActive: false } });
  return { deactivated: true };
}
