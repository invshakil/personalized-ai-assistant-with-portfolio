import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

const tenantSelect = {
  id: true,
  tenantCode: true,
  name: true,
  phone: true,
  isActive: true,
  isExternal: true,
  tenantStatus: true,
  moveInDate: true,
  leaseEndDate: true,
  advancePaid: true,
  advanceAmount: true,
  advanceSettled: true,
  services: {
    where: { isActive: true },
    select: { id: true, monthlyFee: true, service: { select: { name: true } } },
  },
} as const;

function serializeTenantSummary(t: {
  id: string; tenantCode: string | null; name: string; phone: string | null;
  isActive: boolean; isExternal: boolean; tenantStatus: string;
  moveInDate: Date; leaseEndDate: Date | null;
  advancePaid: boolean; advanceAmount: { toNumber: () => number } | number | null;
  advanceSettled: boolean;
  services: { id: string; monthlyFee: { toNumber: () => number } | number; service: { name: string } }[];
}) {
  return {
    id: t.id,
    tenantCode: t.tenantCode,
    name: t.name,
    phone: t.phone,
    isActive: t.isActive,
    isExternal: t.isExternal,
    tenantStatus: t.tenantStatus as "CURRENT" | "FUTURE" | "PAST",
    moveInDate: t.moveInDate.toISOString(),
    leaseEndDate: t.leaseEndDate?.toISOString() ?? null,
    advancePaid: t.advancePaid,
    advanceAmount: Number(t.advanceAmount ?? 0),
    advanceSettled: t.advanceSettled,
    services: t.services.map((s) => ({
      id: s.id,
      serviceName: s.service.name,
      monthlyFee: Number(s.monthlyFee),
    })),
  };
}

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const units = await db.unit.findMany({
    orderBy: { unitNumber: "asc" },
    include: {
      tenants: {
        where: { isActive: true },
        select: tenantSelect,
      },
    },
  });

  const data = units.map((u) => {
    const currentTenant = u.tenants.find((t) => t.tenantStatus === "CURRENT") ?? null;
    const futureTenant = u.tenants.find((t) => t.tenantStatus === "FUTURE") ?? null;
    return {
      id: u.id,
      unitNumber: u.unitNumber,
      floor: u.floor,
      monthlyRent: Number(u.monthlyRent),
      description: u.description,
      isOccupied: u.isOccupied,
      notes: u.notes,
      tenant: currentTenant ? serializeTenantSummary(currentTenant) : null,
      futureTenant: futureTenant ? serializeTenantSummary(futureTenant) : null,
    };
  });

  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { unitNumber, floor, monthlyRent, description, notes } = body;

  if (!unitNumber || !floor || monthlyRent == null) {
    return Response.json({ error: "unitNumber, floor, and monthlyRent are required" }, { status: 400 });
  }

  const unit = await db.unit.create({
    data: { unitNumber, floor, monthlyRent, description: description ?? null, notes: notes ?? null },
  });

  return Response.json({ data: { ...unit, monthlyRent: Number(unit.monthlyRent) } }, { status: 201 });
}
