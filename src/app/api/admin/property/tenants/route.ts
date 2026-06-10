import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

function serializeTenant(t: {
  id: string;
  tenantCode: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  nidNumber: string | null;
  isExternal: boolean;
  isActive: boolean;
  moveInDate: Date;
  moveOutDate: Date | null;
  leaseEndDate: Date | null;
  advancePaid: boolean;
  advanceAmount: { toNumber: () => number } | number | null;
  advanceSettled: boolean;
  notes: string | null;
  unit?: { id: string; unitNumber: string; floor: string; monthlyRent: { toNumber: () => number } | number } | null;
}) {
  return {
    ...t,
    advanceAmount: t.advanceAmount
      ? typeof t.advanceAmount === "object" && "toNumber" in t.advanceAmount
        ? t.advanceAmount.toNumber()
        : Number(t.advanceAmount)
      : 0,
    moveInDate: t.moveInDate.toISOString(),
    moveOutDate: t.moveOutDate?.toISOString() ?? null,
    leaseEndDate: t.leaseEndDate?.toISOString() ?? null,
    unit: t.unit
      ? {
          ...t.unit,
          monthlyRent:
            typeof t.unit.monthlyRent === "object" && "toNumber" in t.unit.monthlyRent
              ? t.unit.monthlyRent.toNumber()
              : Number(t.unit.monthlyRent),
        }
      : null,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter") ?? "active"; // active | inactive | external | all

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

  // For inactive tenants, look up last payment's rentDue as lastRent
  const inactiveIds = tenants.filter((t) => !t.isActive).map((t) => t.id);
  const lastPayments = inactiveIds.length > 0
    ? await db.payment.findMany({
        where: { tenantId: { in: inactiveIds } },
        orderBy: [{ year: "desc" }, { month: "desc" }],
        select: { tenantId: true, rentDue: true },
        distinct: ["tenantId"],
      })
    : [];
  const lastRentMap: Record<string, number> = {};
  for (const p of lastPayments) lastRentMap[p.tenantId] = Number(p.rentDue);

  const data = tenants.map((t) => ({
    ...serializeTenant(t),
    lastRent: t.isActive ? null : (lastRentMap[t.id] ?? null),
    services: t.services.map((s) => ({
      id: s.id,
      serviceId: s.serviceId,
      serviceName: s.service.name,
      monthlyFee: Number(s.monthlyFee),
      startDate: s.startDate.toISOString(),
      endDate: s.endDate?.toISOString() ?? null,
      isActive: s.isActive,
      notes: s.notes,
    })),
  }));

  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    name,
    phone,
    email,
    nidNumber,
    unitId,
    moveInDate,
    leaseEndDate,
    advancePaid,
    advanceAmount,
    notes,
    isExternal,
  } = body;

  if (!name || !moveInDate) {
    return Response.json({ error: "name and moveInDate are required" }, { status: 400 });
  }

  if (!isExternal && !unitId) {
    return Response.json({ error: "unitId is required for non-external tenants" }, { status: 400 });
  }

  // Auto-generate next tenantCode
  const last = await db.tenant.findFirst({
    where: { tenantCode: { not: null } },
    orderBy: { tenantCode: "desc" },
    select: { tenantCode: true },
  });
  const nextNum = last?.tenantCode ? parseInt(last.tenantCode.replace("T", "")) + 1 : 1;
  const tenantCode = `T${String(nextNum).padStart(2, "0")}`;

  // Determine tenant status: FUTURE if the unit already has a CURRENT active tenant
  let tenantStatus: "CURRENT" | "FUTURE" = "CURRENT";
  if (unitId && !isExternal) {
    const existingCurrent = await db.tenant.findFirst({
      where: { unitId, tenantStatus: "CURRENT", isActive: true },
      select: { id: true },
    });
    if (existingCurrent) tenantStatus = "FUTURE";
  }

  const tenant = await db.tenant.create({
    data: {
      tenantCode,
      name,
      phone: phone ?? null,
      email: email ?? null,
      nidNumber: nidNumber ?? null,
      unitId: unitId ?? null,
      moveInDate: new Date(moveInDate),
      leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null,
      advancePaid: advancePaid ?? false,
      advanceAmount: advanceAmount ?? 0,
      notes: notes ?? null,
      isExternal: isExternal ?? false,
      isActive: true,
      tenantStatus,
    },
    include: {
      unit: { select: { id: true, unitNumber: true, floor: true, monthlyRent: true } },
    },
  });

  // Mark unit as occupied only when the new tenant is CURRENT
  if (unitId && tenantStatus === "CURRENT") {
    await db.unit.update({ where: { id: unitId }, data: { isOccupied: true } });
  }

  return Response.json({ data: serializeTenant(tenant) }, { status: 201 });
}
