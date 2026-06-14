import { db } from "@/lib/db";

export function getPayees() {
  return db.payee.findMany({ orderBy: { name: "asc" } });
}

export function getPayee(id: string) {
  return db.payee.findUnique({ where: { id } });
}

export interface CreatePayeeInput {
  name: string;
  role: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  nidNumber?: string | null;
  notes?: string | null;
}

export function createPayee(input: CreatePayeeInput) {
  return db.payee.create({
    data: {
      name: input.name,
      role: input.role,
      phone: input.phone ?? null,
      email: input.email ?? null,
      address: input.address ?? null,
      nidNumber: input.nidNumber ?? null,
      notes: input.notes ?? null,
    },
  });
}

export interface UpdatePayeeInput {
  name?: string;
  role?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  nidNumber?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export function updatePayee(id: string, input: UpdatePayeeInput) {
  return db.payee.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.role && { role: input.role }),
      ...(input.phone !== undefined && { phone: input.phone ?? null }),
      ...(input.email !== undefined && { email: input.email ?? null }),
      ...(input.address !== undefined && { address: input.address ?? null }),
      ...(input.nidNumber !== undefined && { nidNumber: input.nidNumber ?? null }),
      ...(input.notes !== undefined && { notes: input.notes ?? null }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
}

/** Soft-delete: payees are deactivated, not removed (preserves expense history). */
export async function deactivatePayee(id: string) {
  await db.payee.update({ where: { id }, data: { isActive: false } });
  return { deactivated: true };
}
