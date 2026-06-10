import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";

export interface CreateRentChangeInput {
  tenantId: string;
  effectiveDate: string;
  newRent: number;
  reason?: string | null;
}

export async function createRentChange(input: CreateRentChangeInput) {
  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    include: { unit: { select: { monthlyRent: true } } },
  });
  if (!tenant) throw new Error("Tenant not found");

  const previousRent = tenant.unit ? toNum(tenant.unit.monthlyRent) : 0;

  const rentChange = await db.rentChange.create({
    data: {
      tenantId: input.tenantId,
      effectiveDate: new Date(input.effectiveDate),
      previousRent,
      newRent: input.newRent,
      reason: input.reason ?? null,
      appliedAt: null,
    },
  });

  return {
    ...rentChange,
    previousRent: toNum(rentChange.previousRent),
    newRent: toNum(rentChange.newRent),
    effectiveDate: rentChange.effectiveDate.toISOString(),
    appliedAt: null,
  };
}

export interface UpdateRentChangeInput {
  effectiveDate?: string;
  newRent?: number;
  reason?: string | null;
}

export async function updateRentChange(id: string, input: UpdateRentChangeInput) {
  const rc = await db.rentChange.findUnique({ where: { id } });
  if (!rc) throw new Error("Not found");
  if (rc.appliedAt) throw new Error("Cannot edit a rent change that has already been applied");

  const updated = await db.rentChange.update({
    where: { id },
    data: {
      ...(input.effectiveDate && { effectiveDate: new Date(input.effectiveDate) }),
      ...(input.newRent != null && { newRent: input.newRent }),
      ...(input.reason !== undefined && { reason: input.reason ?? null }),
    },
  });

  return {
    ...updated,
    previousRent: toNum(updated.previousRent),
    newRent: toNum(updated.newRent),
    effectiveDate: updated.effectiveDate.toISOString(),
    appliedAt: toIso(updated.appliedAt),
  };
}

export async function deleteRentChange(id: string) {
  const rc = await db.rentChange.findUnique({ where: { id } });
  if (!rc) throw new Error("Not found");
  if (rc.appliedAt) throw new Error("Cannot delete a rent change that has already been applied");
  await db.rentChange.delete({ where: { id } });
  return { ok: true };
}
