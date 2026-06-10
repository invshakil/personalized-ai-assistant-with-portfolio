import { db } from "@/lib/db";
import { toNum } from "./_serializers";

export async function getUnits() {
  const units = await db.unit.findMany({
    orderBy: { unitNumber: "asc" },
    include: {
      tenants: {
        where: { isActive: true },
        select: {
          id: true, tenantCode: true, name: true, phone: true,
          isActive: true, isExternal: true, tenantStatus: true,
          moveInDate: true, leaseEndDate: true,
          advancePaid: true, advanceAmount: true, advanceSettled: true,
          services: {
            where: { isActive: true },
            select: { id: true, monthlyFee: true, service: { select: { name: true } } },
          },
          rentChanges: {
            where: { appliedAt: null },
            select: { newRent: true },
            orderBy: { effectiveDate: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  return units.map((u) => {
    const today = new Date();
    // A tenant is "current" only if they are CURRENT and have actually moved in.
    // CURRENT tenants with a future moveInDate were promoted early — treat them as future.
    const currentTenant = u.tenants.find((t) => t.tenantStatus === "CURRENT" && t.moveInDate <= today) ?? null;
    const futureTenant = u.tenants.find((t) => t.tenantStatus === "FUTURE" || (t.tenantStatus === "CURRENT" && t.moveInDate > today)) ?? null;

    const serialize = (t: typeof currentTenant) => {
      if (!t) return null;
      return {
        id: t.id,
        tenantCode: t.tenantCode,
        name: t.name,
        phone: t.phone,
        isActive: t.isActive,
        isExternal: t.isExternal,
        tenantStatus: t.tenantStatus === "CURRENT" && t.moveInDate > today ? "FUTURE" : (t.tenantStatus as string),
        moveInDate: t.moveInDate.toISOString(),
        leaseEndDate: t.leaseEndDate?.toISOString() ?? null,
        advancePaid: t.advancePaid,
        advanceAmount: toNum(t.advanceAmount),
        advanceSettled: t.advanceSettled,
        scheduledRent: t.rentChanges.length > 0 ? toNum(t.rentChanges[0].newRent) : null,
        services: t.services.map((s) => ({
          id: s.id,
          serviceName: s.service.name,
          monthlyFee: toNum(s.monthlyFee),
        })),
      };
    };

    return {
      id: u.id,
      unitNumber: u.unitNumber,
      floor: u.floor,
      monthlyRent: toNum(u.monthlyRent),
      description: u.description,
      notes: u.notes,
      // Derived from tenants so it's always consistent with actual state
      isOccupied: currentTenant !== null,
      tenant: serialize(currentTenant),
      futureTenant: serialize(futureTenant),
    };
  });
}

export async function getUnit(id: string) {
  const unit = await db.unit.findUnique({
    where: { id },
    include: {
      tenants: {
        select: {
          id: true, tenantCode: true, name: true, phone: true,
          isActive: true, tenantStatus: true,
          moveInDate: true, moveOutDate: true, leaseEndDate: true,
          advancePaid: true, advanceAmount: true, advanceSettled: true,
          rentChanges: {
            where: { appliedAt: null },
            select: { newRent: true },
            orderBy: { effectiveDate: "asc" },
            take: 1,
          },
        },
        orderBy: [{ tenantStatus: "asc" }, { moveInDate: "desc" }],
      },
    },
  });

  if (!unit) return null;

  return {
    id: unit.id,
    unitNumber: unit.unitNumber,
    floor: unit.floor,
    monthlyRent: toNum(unit.monthlyRent),
    description: unit.description,
    notes: unit.notes,
    isOccupied: unit.tenants.some((t) => t.tenantStatus === "CURRENT" && t.isActive && t.moveInDate <= new Date()),
    tenants: unit.tenants.map((t) => ({
      id: t.id,
      tenantCode: t.tenantCode,
      name: t.name,
      phone: t.phone,
      isActive: t.isActive,
      tenantStatus: t.tenantStatus as string,
      moveInDate: t.moveInDate.toISOString(),
      moveOutDate: t.moveOutDate?.toISOString() ?? null,
      leaseEndDate: t.leaseEndDate?.toISOString() ?? null,
      advancePaid: t.advancePaid,
      advanceAmount: toNum(t.advanceAmount),
      advanceSettled: t.advanceSettled,
      scheduledRent: t.rentChanges.length > 0 ? toNum(t.rentChanges[0].newRent) : null,
    })),
  };
}

export interface CreateUnitInput {
  unitNumber: string;
  floor: string;
  monthlyRent: number;
  description?: string | null;
  notes?: string | null;
}

export async function createUnit(input: CreateUnitInput) {
  const unit = await db.unit.create({
    data: {
      unitNumber: input.unitNumber,
      floor: input.floor,
      monthlyRent: input.monthlyRent,
      description: input.description ?? null,
      notes: input.notes ?? null,
    },
  });
  return { ...unit, monthlyRent: toNum(unit.monthlyRent) };
}

export interface UpdateUnitInput {
  unitNumber?: string;
  floor?: string;
  monthlyRent?: number;
  description?: string | null;
  notes?: string | null;
}

export async function updateUnit(id: string, input: UpdateUnitInput) {
  const unit = await db.unit.update({
    where: { id },
    data: {
      ...(input.unitNumber && { unitNumber: input.unitNumber }),
      ...(input.floor && { floor: input.floor }),
      ...(input.monthlyRent != null && { monthlyRent: input.monthlyRent }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return { ...unit, monthlyRent: toNum(unit.monthlyRent) };
}

export async function deleteUnit(id: string) {
  const unit = await db.unit.findUnique({ where: { id }, include: { tenants: true } });
  if (!unit) throw new Error("Not found");
  if (unit.isOccupied) throw new Error("Cannot delete an occupied unit");
  await db.unit.delete({ where: { id } });
  return { deleted: true };
}
