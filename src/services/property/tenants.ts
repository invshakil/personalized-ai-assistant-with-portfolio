import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeTenant(t: Record<string, any>) {
  return {
    ...t,
    advanceAmount: toNum(t.advanceAmount),
    moveInDate: t.moveInDate instanceof Date ? t.moveInDate.toISOString() : t.moveInDate,
    moveOutDate: toIso(t.moveOutDate),
    leaseEndDate: toIso(t.leaseEndDate),
    unit: t.unit ? { ...t.unit, monthlyRent: toNum(t.unit.monthlyRent) } : null,
  };
}

export type TenantFilter = "active" | "inactive" | "external" | "all" | "future";

export async function getTenants(filter: TenantFilter = "active") {
  const where =
    filter === "all"
      ? {}
      : filter === "external"
        ? { isExternal: true, isActive: true }
        : filter === "inactive"
          ? { isActive: false }
          : filter === "future"
            ? { isActive: true, tenantStatus: "FUTURE" as const }
            : { isActive: true, isExternal: false, tenantStatus: "CURRENT" as const };

  const tenants = await db.tenant.findMany({
    where,
    orderBy: { tenantCode: "asc" },
    include: {
      unit: { select: { id: true, unitNumber: true, floor: true, monthlyRent: true } },
      services: {
        where: { isActive: true },
        include: { service: { select: { name: true } } },
      },
    },
  });

  const inactiveIds = tenants.filter((t) => !t.isActive).map((t) => t.id);
  const lastPayments =
    inactiveIds.length > 0
      ? await db.payment.findMany({
          where: { tenantId: { in: inactiveIds } },
          orderBy: [{ year: "desc" }, { month: "desc" }],
          select: { tenantId: true, rentDue: true },
          distinct: ["tenantId"],
        })
      : [];

  const lastRentMap: Record<string, number> = {};
  for (const p of lastPayments) lastRentMap[p.tenantId] = toNum(p.rentDue);

  const today = new Date();
  return tenants.map((t) => ({
    ...serializeTenant(t),
    // CURRENT tenants who haven't reached their moveInDate display as FUTURE (Scheduled badge)
    tenantStatus:
      t.isActive && t.tenantStatus === "CURRENT" && t.moveInDate > today
        ? "FUTURE"
        : t.tenantStatus,
    lastRent: t.isActive ? null : (lastRentMap[t.id] ?? null),
    services: t.services.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      serviceName: s.service.name,
      monthlyFee: toNum(s.monthlyFee),
      startDate: s.startDate.toISOString(),
      endDate: toIso(s.endDate),
      isActive: s.isActive,
      notes: s.notes,
    })),
  }));
}

export async function getTenant(id: string) {
  const tenant = await db.tenant.findUnique({
    where: { id },
    include: {
      unit: { select: { id: true, unitNumber: true, floor: true, monthlyRent: true } },
      services: {
        include: { service: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      rentChanges: { orderBy: { effectiveDate: "asc" } },
      payments: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        include: { transactions: { orderBy: { date: "desc" } } },
        take: 24,
      },
    },
  });

  if (!tenant) return null;

  return {
    ...tenant,
    advanceAmount: toNum(tenant.advanceAmount),
    moveInDate: tenant.moveInDate.toISOString(),
    moveOutDate: toIso(tenant.moveOutDate),
    leaseEndDate: toIso(tenant.leaseEndDate),
    unit: tenant.unit ? { ...tenant.unit, monthlyRent: toNum(tenant.unit.monthlyRent) } : null,
    services: tenant.services.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      serviceName: s.service.name,
      monthlyFee: toNum(s.monthlyFee),
      startDate: s.startDate.toISOString(),
      endDate: toIso(s.endDate),
      isActive: s.isActive,
      notes: s.notes,
    })),
    rentChanges: tenant.rentChanges.map((rc) => ({
      ...rc,
      previousRent: toNum(rc.previousRent),
      newRent: toNum(rc.newRent),
      effectiveDate: rc.effectiveDate.toISOString(),
      appliedAt: toIso(rc.appliedAt),
    })),
    payments: tenant.payments.map((p) => ({
      ...p,
      rentDue: toNum(p.rentDue),
      amountPaid: toNum(p.amountPaid),
      advanceApplied: toNum(p.advanceApplied),
      carryForward: toNum(p.carryForward),
      balance: toNum(p.rentDue) - toNum(p.amountPaid) - toNum(p.advanceApplied),
      paidDate: toIso(p.paidDate),
      transactions: p.transactions.map((tx) => ({
        ...tx,
        amount: toNum(tx.amount),
        date: tx.date.toISOString(),
        createdAt: tx.createdAt.toISOString(),
      })),
    })),
  };
}

export interface CreateTenantInput {
  name: string;
  phone?: string | null;
  email?: string | null;
  nidNumber?: string | null;
  unitId?: string | null;
  moveInDate: string;
  leaseEndDate?: string | null;
  advancePaid?: boolean;
  advanceAmount?: number;
  notes?: string | null;
  isExternal?: boolean;
}

export async function createTenant(input: CreateTenantInput) {
  if (!input.isExternal && !input.unitId) {
    throw new Error("unitId is required for non-external tenants");
  }

  const last = await db.tenant.findFirst({
    where: { tenantCode: { not: null } },
    orderBy: { tenantCode: "desc" },
    select: { tenantCode: true },
  });
  const nextNum = last?.tenantCode ? parseInt(last.tenantCode.replace("T", "")) + 1 : 1;
  const tenantCode = `T${String(nextNum).padStart(2, "0")}`;

  let tenantStatus: "CURRENT" | "FUTURE" = "CURRENT";
  if (input.unitId && !input.isExternal) {
    const existingCurrent = await db.tenant.findFirst({
      where: { unitId: input.unitId, tenantStatus: "CURRENT", isActive: true },
      select: { id: true },
    });
    if (existingCurrent) tenantStatus = "FUTURE";
  }

  const tenant = await db.tenant.create({
    data: {
      tenantCode,
      name: input.name,
      phone: input.phone ?? null,
      email: input.email ?? null,
      nidNumber: input.nidNumber ?? null,
      unitId: input.unitId ?? null,
      moveInDate: new Date(input.moveInDate),
      leaseEndDate: input.leaseEndDate ? new Date(input.leaseEndDate) : null,
      advancePaid: input.advancePaid ?? false,
      advanceAmount: input.advanceAmount ?? 0,
      notes: input.notes ?? null,
      isExternal: input.isExternal ?? false,
      isActive: true,
      tenantStatus,
    },
    include: {
      unit: { select: { id: true, unitNumber: true, floor: true, monthlyRent: true } },
    },
  });

  if (input.unitId && tenantStatus === "CURRENT") {
    await db.unit.update({ where: { id: input.unitId }, data: { isOccupied: true } });
  }

  return serializeTenant(tenant);
}

export interface UpdateTenantInput {
  name?: string;
  phone?: string | null;
  email?: string | null;
  nidNumber?: string | null;
  moveInDate?: string;
  leaseEndDate?: string | null;
  advancePaid?: boolean;
  advanceAmount?: number;
  advanceSettled?: boolean;
  notes?: string | null;
  unitId?: string | null;
}

export async function updateTenant(id: string, input: UpdateTenantInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  if (input.name) data.name = input.name;
  if (input.moveInDate) data.moveInDate = new Date(input.moveInDate);
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.nidNumber !== undefined) data.nidNumber = input.nidNumber;
  if (input.leaseEndDate !== undefined)
    data.leaseEndDate = input.leaseEndDate ? new Date(input.leaseEndDate) : null;
  if (input.advancePaid !== undefined) data.advancePaid = input.advancePaid;
  if (input.advanceAmount !== undefined) data.advanceAmount = input.advanceAmount;
  if (input.advanceSettled !== undefined) data.advanceSettled = input.advanceSettled;
  if (input.notes !== undefined) data.notes = input.notes;

  if ("unitId" in input) {
    const newUnitId = input.unitId || null;
    if (newUnitId) {
      const existingCurrent = await db.tenant.findFirst({
        where: { unitId: newUnitId, tenantStatus: "CURRENT", isActive: true, id: { not: id } },
        select: { id: true },
      });
      const newStatus = existingCurrent ? "FUTURE" : "CURRENT";
      data.unitId = newUnitId;
      data.tenantStatus = newStatus;
      if (newStatus === "CURRENT") {
        await db.unit.update({ where: { id: newUnitId }, data: { isOccupied: true } });
      }
    } else {
      data.unitId = null;
    }
  }

  const tenant = await db.tenant.update({ where: { id }, data });
  return {
    ...tenant,
    advanceAmount: toNum(tenant.advanceAmount),
    moveInDate: tenant.moveInDate.toISOString(),
    moveOutDate: toIso(tenant.moveOutDate),
    leaseEndDate: toIso(tenant.leaseEndDate),
  };
}

export async function deactivateTenant(id: string) {
  const tenant = await db.tenant.findUnique({
    where: { id },
    select: { unitId: true, tenantStatus: true },
  });
  if (!tenant) throw new Error("Not found");

  const unitId = tenant.unitId;
  const now = new Date();

  // Find a queued future tenant — also covers CURRENT tenants with a future moveInDate
  const futureTenant = unitId
    ? await db.tenant.findFirst({
        where: { unitId, tenantStatus: "FUTURE", isActive: true, id: { not: id } },
        select: { id: true, moveInDate: true },
      })
    : null;

  // Only promote if the future tenant has already reached their move-in date
  const shouldPromote = !!futureTenant && futureTenant.moveInDate <= now;

  await db.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id },
      data: { isActive: false, tenantStatus: "PAST", unitId: null, moveOutDate: now },
    });
    if (shouldPromote && futureTenant) {
      await tx.tenant.update({ where: { id: futureTenant.id }, data: { tenantStatus: "CURRENT" } });
      // Unit stays occupied
    } else if (unitId) {
      // No eligible current tenant — unit is now vacant
      await tx.unit.update({ where: { id: unitId }, data: { isOccupied: false } });
    }
  });

  return { deactivated: true, promoted: shouldPromote };
}

export async function activateTenant(id: string) {
  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) throw new Error("Not found");
  if (tenant.isActive) throw new Error("Tenant is already active");
  await db.tenant.update({
    where: { id },
    data: { isActive: true, tenantStatus: "CURRENT", moveOutDate: null },
  });
  return { ok: true };
}

export async function getMoveOutPreview(id: string, moveOutDate: string) {
  const tenant = await db.tenant.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      tenantCode: true,
      advanceAmount: true,
      advancePaid: true,
      advanceSettled: true,
    },
  });
  if (!tenant) throw new Error("Not found");
  if (!tenant.advancePaid) throw new Error("Tenant has no advance on record");

  const advanceBalance = toNum(tenant.advanceAmount);

  const outstanding = await db.payment.findMany({
    where: { tenantId: id, status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const outstandingItems = outstanding.map((p) => ({
    id: p.id,
    month: p.month,
    year: p.year,
    rentDue: toNum(p.rentDue),
    amountPaid: toNum(p.amountPaid),
    advanceApplied: toNum(p.advanceApplied),
    balance: toNum(p.rentDue) - toNum(p.amountPaid) - toNum(p.advanceApplied),
    status: p.status,
  }));

  const totalOutstanding = outstandingItems.reduce((sum, p) => sum + p.balance, 0);

  return {
    tenantId: id,
    tenantName: tenant.name,
    tenantCode: tenant.tenantCode,
    moveOutDate,
    advanceBalance,
    totalOutstanding,
    refundable: Math.max(0, advanceBalance - totalOutstanding),
    stillOwed: Math.max(0, totalOutstanding - advanceBalance),
    outstandingPayments: outstandingItems,
  };
}

export interface Settlement {
  paymentId: string;
  advanceToApply: number;
}

export async function settleMoveOut(id: string, moveOutDate: string, settlements: Settlement[]) {
  const tenant = await db.tenant.findUnique({
    where: { id },
    select: { id: true, unitId: true, advanceAmount: true, advancePaid: true },
  });
  if (!tenant) throw new Error("Not found");

  let remainingAdvance = toNum(tenant.advanceAmount);

  await db.$transaction(async (tx) => {
    for (const s of settlements) {
      if (s.advanceToApply <= 0) continue;
      const applied = Math.min(s.advanceToApply, remainingAdvance);
      if (applied <= 0) continue;

      const payment = await tx.payment.findUnique({ where: { id: s.paymentId } });
      if (!payment) continue;

      const newAdvanceApplied = toNum(payment.advanceApplied) + applied;
      const newAmountPaid = toNum(payment.amountPaid);
      const newTotal = newAmountPaid + newAdvanceApplied;
      const newStatus =
        newTotal >= toNum(payment.rentDue) ? "PAID" : newTotal > 0 ? "PARTIAL" : "PENDING";

      await tx.payment.update({
        where: { id: s.paymentId },
        data: {
          advanceApplied: newAdvanceApplied,
          status: newStatus,
          paidDate: newStatus === "PAID" ? new Date(moveOutDate) : payment.paidDate,
        },
      });

      await tx.paymentTransaction.create({
        data: {
          paymentId: s.paymentId,
          type: "ADVANCE_APPLIED",
          amount: applied,
          date: new Date(moveOutDate),
          notes: "Settled from advance on move-out",
        },
      });

      remainingAdvance -= applied;
    }

    await tx.tenant.update({
      where: { id },
      data: {
        isActive: false,
        moveOutDate: new Date(moveOutDate),
        advanceAmount: remainingAdvance,
        advanceSettled: true,
      },
    });

    await tx.tenantService.updateMany({
      where: { tenantId: id, isActive: true },
      data: { isActive: false, endDate: new Date(moveOutDate) },
    });

    if (tenant.unitId) {
      await tx.unit.update({ where: { id: tenant.unitId }, data: { isOccupied: false } });
    }
  });

  return { success: true, remainingAdvanceRefundable: remainingAdvance };
}

export async function autoDeactivateExpired() {
  const now = new Date();
  const expired = await db.tenant.findMany({
    where: { isActive: true, tenantStatus: "CURRENT", leaseEndDate: { lt: now } },
    select: { id: true, unitId: true },
  });

  if (expired.length === 0) return { deactivated: 0, promoted: 0 };

  let deactivated = 0;
  let promoted = 0;

  for (const tenant of expired) {
    const unitId = tenant.unitId;
    const futureTenant = unitId
      ? await db.tenant.findFirst({
          where: { unitId, tenantStatus: "FUTURE", isActive: true, id: { not: tenant.id } },
          select: { id: true, moveInDate: true },
        })
      : null;

    const shouldPromote = !!futureTenant && futureTenant.moveInDate <= now;

    await db.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { isActive: false, tenantStatus: "PAST", unitId: null, moveOutDate: now },
      });
      if (shouldPromote && futureTenant) {
        await tx.tenant.update({
          where: { id: futureTenant.id },
          data: { tenantStatus: "CURRENT" },
        });
        promoted++;
      } else if (unitId) {
        await tx.unit.update({ where: { id: unitId }, data: { isOccupied: false } });
      }
    });

    deactivated++;
  }

  return { deactivated, promoted };
}
