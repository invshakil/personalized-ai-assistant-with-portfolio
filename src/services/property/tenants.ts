import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";
import { recordLinkedEntry } from "@/services/money";

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

/** Tenant lifecycle status used for the Tenants-tab status filter. */
export type TenantStatusFilter = "CURRENT" | "FUTURE";

export interface GetTenantsOptions {
  /** The existing coarse filter (active/inactive/external/all/future). */
  filter?: TenantFilter;
  /** Restrict to tenants assigned to any of these units. */
  unitIds?: string[];
  /** Restrict to CURRENT (active) or FUTURE (scheduled) tenants. */
  status?: TenantStatusFilter;
  /** Case-insensitive search on tenant name or phone. */
  q?: string;
}

export async function getTenants(opts: TenantFilter | GetTenantsOptions = "active") {
  // Back-compat: a bare string is the legacy `filter` argument.
  const {
    filter = "active",
    unitIds,
    status,
    q,
  }: GetTenantsOptions = typeof opts === "string" ? { filter: opts } : opts;

  const base =
    filter === "all"
      ? {}
      : filter === "external"
        ? { isExternal: true, isActive: true }
        : filter === "inactive"
          ? { isActive: false }
          : filter === "future"
            ? { isActive: true, tenantStatus: "FUTURE" as const }
            : { isActive: true, isExternal: false, tenantStatus: "CURRENT" as const };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = { ...base };
  if (unitIds?.length) where.unitId = { in: unitIds };
  if (status) where.tenantStatus = status;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

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
  /**
   * Optional Money-Manager account to credit with the advance. Opt-in: when set
   * (and advancePaid with advanceAmount > 0) a linked ledger CREDIT is posted at
   * create time so the deposit lands in that account's balance. No back-sync —
   * editing the advance later via updateTenant does not touch the ledger entry.
   */
  advanceAccountId?: string;
  notes?: string | null;
  isExternal?: boolean;
  /**
   * When this tenant is queued as a future tenant for an already-occupied unit,
   * the date the current tenant moves out. Their moveOutDate and leaseEndDate are
   * set to this value (they stay active until then). Defaults to the day before
   * the new tenant's move-in date.
   */
  outgoingMoveOutDate?: string | null;
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
  let outgoingTenantId: string | null = null;
  if (input.unitId && !input.isExternal) {
    const existingCurrent = await db.tenant.findFirst({
      where: { unitId: input.unitId, tenantStatus: "CURRENT", isActive: true },
      select: { id: true },
    });
    if (existingCurrent) {
      tenantStatus = "FUTURE";
      outgoingTenantId = existingCurrent.id;
    }
  }

  const moveInDate = new Date(input.moveInDate);

  // Scheduling a future tenant into an occupied unit ends the current tenant's
  // stay. Default their departure to the day before the new tenant moves in.
  let outgoingMoveOut: Date | null = null;
  if (outgoingTenantId) {
    if (input.outgoingMoveOutDate) {
      outgoingMoveOut = new Date(input.outgoingMoveOutDate);
    } else {
      outgoingMoveOut = new Date(moveInDate);
      outgoingMoveOut.setDate(outgoingMoveOut.getDate() - 1);
    }
  }

  const tenant = await db.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        tenantCode,
        name: input.name,
        phone: input.phone ?? null,
        email: input.email ?? null,
        nidNumber: input.nidNumber ?? null,
        unitId: input.unitId ?? null,
        moveInDate,
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

    if (outgoingTenantId && outgoingMoveOut) {
      // Keep the outgoing tenant active/CURRENT until their move-out date; payment
      // generation deactivates them once the new tenant's move-in month is run.
      await tx.tenant.update({
        where: { id: outgoingTenantId },
        data: { moveOutDate: outgoingMoveOut, leaseEndDate: outgoingMoveOut },
      });
    }

    return created;
  });

  if (input.unitId && tenantStatus === "CURRENT") {
    await db.unit.update({ where: { id: input.unitId }, data: { isOccupied: true } });
  }

  // Opt-in cross-domain link: post the advance as a ledger CREDIT only when the
  // caller supplied an account and an advance was actually paid. Posted once at
  // create time; no back-sync. If it throws, let it propagate.
  // Dated today (when the deposit is received/recorded), not the move-in date —
  // a future move-in would otherwise push the entry past the ledger's default
  // window even though the cash has already landed in the account.
  const advanceAmount = input.advanceAmount ?? 0;
  if (input.advancePaid && advanceAmount > 0 && input.advanceAccountId) {
    await recordLinkedEntry({
      accountId: input.advanceAccountId,
      direction: "CREDIT",
      amount: advanceAmount,
      date: new Date().toISOString().slice(0, 10),
      categoryName: "Tenant Advance",
      description: `Advance — ${tenant.name}`,
    });
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
  /**
   * When moving this tenant into an already-occupied unit (they become a future
   * tenant), the date the current tenant moves out. Their moveOutDate and
   * leaseEndDate are set to this value. Defaults to the day before this tenant's
   * move-in date.
   */
  outgoingMoveOutDate?: string | null;
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

  let outgoingTenantId: string | null = null;
  let outgoingMoveOut: Date | null = null;

  // Only treat unitId as a change when explicitly provided (a caller that omits
  // it sends undefined; passing null is an explicit un-assign).
  if (input.unitId !== undefined) {
    const newUnitId = input.unitId || null;
    if (newUnitId) {
      const existingCurrent = await db.tenant.findFirst({
        where: { unitId: newUnitId, tenantStatus: "CURRENT", isActive: true, id: { not: id } },
        select: { id: true },
      });
      const newStatus = existingCurrent ? "FUTURE" : "CURRENT";
      data.unitId = newUnitId;
      data.tenantStatus = newStatus;

      if (existingCurrent) {
        // Moving into an occupied unit ends the current tenant's stay. Default
        // their departure to the day before this tenant's move-in date.
        outgoingTenantId = existingCurrent.id;
        let moveIn: Date;
        if (input.moveInDate) {
          moveIn = new Date(input.moveInDate);
        } else {
          const self = await db.tenant.findUnique({
            where: { id },
            select: { moveInDate: true },
          });
          moveIn = self?.moveInDate ?? new Date();
        }
        if (input.outgoingMoveOutDate) {
          outgoingMoveOut = new Date(input.outgoingMoveOutDate);
        } else {
          outgoingMoveOut = new Date(moveIn);
          outgoingMoveOut.setDate(outgoingMoveOut.getDate() - 1);
        }
      }
    } else {
      data.unitId = null;
    }
  }

  const tenant = await db.$transaction(async (tx) => {
    if (data.tenantStatus === "CURRENT" && data.unitId) {
      await tx.unit.update({ where: { id: data.unitId as string }, data: { isOccupied: true } });
    }
    if (outgoingTenantId && outgoingMoveOut) {
      // Outgoing tenant stays active/CURRENT until their move-out date; payment
      // generation deactivates them once the new tenant's move-in month is run.
      await tx.tenant.update({
        where: { id: outgoingTenantId },
        data: { moveOutDate: outgoingMoveOut, leaseEndDate: outgoingMoveOut },
      });
    }
    return tx.tenant.update({ where: { id }, data });
  });
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

export interface MoveTenantInput {
  newUnitId: string;
  /** Effective date of the move. Defaults to today. */
  moveDate?: string;
  /** Optional new rent for the destination unit (overrides its current monthlyRent). */
  newRent?: number;
  /** Optional note appended to the auto-generated rent-change reason. */
  reason?: string | null;
  /** TenantService ids to end as part of the move. */
  endServiceIds?: string[];
  newServices?: {
    serviceId: string;
    monthlyFee: number;
    startDate?: string;
    notes?: string | null;
  }[];
}

export async function moveTenant(tenantId: string, input: MoveTenantInput) {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { unit: { select: { id: true, unitNumber: true, monthlyRent: true } } },
  });
  if (!tenant) throw new Error("Tenant not found");
  if (!tenant.isActive || tenant.tenantStatus !== "CURRENT" || !tenant.unit) {
    throw new Error(
      "Only current, active tenants with an assigned unit can be moved. Use Assign Unit for tenants without a unit."
    );
  }
  if (input.newUnitId === tenant.unitId) {
    throw new Error("Tenant is already in this unit.");
  }

  const newUnit = await db.unit.findUnique({ where: { id: input.newUnitId } });
  if (!newUnit) throw new Error("Destination unit not found");

  const destinationOccupant = await db.tenant.findFirst({
    where: { unitId: input.newUnitId, tenantStatus: "CURRENT", isActive: true },
    select: { name: true },
  });
  if (destinationOccupant) {
    throw new Error(
      `Unit ${newUnit.unitNumber} is currently occupied by ${destinationOccupant.name}. Free it first.`
    );
  }

  const oldUnit = tenant.unit;
  const moveDate = input.moveDate ? new Date(input.moveDate) : new Date();
  const finalRent = input.newRent ?? toNum(newUnit.monthlyRent);

  const result = await db.$transaction(async (tx) => {
    // Old unit: promote a queued future tenant whose move-in date has passed,
    // otherwise free the unit (mirrors deactivateTenant's promotion logic).
    const futureTenant = await tx.tenant.findFirst({
      where: { unitId: oldUnit.id, tenantStatus: "FUTURE", isActive: true, id: { not: tenantId } },
      select: { id: true, moveInDate: true },
    });
    const shouldPromote = !!futureTenant && futureTenant.moveInDate <= moveDate;
    if (shouldPromote && futureTenant) {
      await tx.tenant.update({ where: { id: futureTenant.id }, data: { tenantStatus: "CURRENT" } });
    } else {
      await tx.unit.update({ where: { id: oldUnit.id }, data: { isOccupied: false } });
    }

    await tx.tenant.update({ where: { id: tenantId }, data: { unitId: input.newUnitId } });

    await tx.unit.update({
      where: { id: input.newUnitId },
      data: { isOccupied: true, ...(input.newRent != null && { monthlyRent: input.newRent }) },
    });

    const baseReason = `Moved: Unit ${oldUnit.unitNumber} → Unit ${newUnit.unitNumber}`;
    await tx.rentChange.create({
      data: {
        tenantId,
        effectiveDate: moveDate,
        previousRent: toNum(oldUnit.monthlyRent),
        newRent: finalRent,
        reason: input.reason ? `${baseReason} — ${input.reason}` : baseReason,
        appliedAt: moveDate,
      },
    });

    if (input.endServiceIds?.length) {
      await tx.tenantService.updateMany({
        where: { id: { in: input.endServiceIds }, tenantId },
        data: { isActive: false, endDate: moveDate },
      });
    }

    for (const svc of input.newServices ?? []) {
      const existing = await tx.tenantService.findUnique({
        where: { tenantId_serviceId: { tenantId, serviceId: svc.serviceId } },
      });
      if (existing) {
        await tx.tenantService.update({
          where: { tenantId_serviceId: { tenantId, serviceId: svc.serviceId } },
          data: {
            monthlyFee: svc.monthlyFee,
            startDate: svc.startDate ? new Date(svc.startDate) : moveDate,
            endDate: null,
            isActive: true,
            notes: svc.notes ?? null,
          },
        });
      } else {
        await tx.tenantService.create({
          data: {
            tenantId,
            serviceId: svc.serviceId,
            monthlyFee: svc.monthlyFee,
            startDate: svc.startDate ? new Date(svc.startDate) : moveDate,
            isActive: true,
            notes: svc.notes ?? null,
          },
        });
      }
    }

    return { promotedFutureTenantId: shouldPromote ? (futureTenant?.id ?? null) : null };
  });

  return { ...result, tenant: await getTenant(tenantId) };
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
