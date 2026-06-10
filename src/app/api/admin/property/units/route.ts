import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const units = await db.unit.findMany({
    orderBy: { unitNumber: "asc" },
    include: {
      tenant: {
        where: { isActive: true },
        select: {
          id: true,
          tenantCode: true,
          name: true,
          phone: true,
          isActive: true,
          isExternal: true,
          moveInDate: true,
          leaseEndDate: true,
          advancePaid: true,
          advanceAmount: true,
          advanceSettled: true,
          services: {
            where: { isActive: true },
            select: { id: true, monthlyFee: true, service: { select: { name: true } } },
          },
        },
      },
    },
  });

  const data = units.map((u) => ({
    id: u.id,
    unitNumber: u.unitNumber,
    floor: u.floor,
    monthlyRent: Number(u.monthlyRent),
    description: u.description,
    isOccupied: u.isOccupied,
    notes: u.notes,
    tenant: u.tenant
      ? {
          ...u.tenant,
          advanceAmount: Number(u.tenant.advanceAmount ?? 0),
          moveInDate: u.tenant.moveInDate.toISOString(),
          leaseEndDate: u.tenant.leaseEndDate?.toISOString() ?? null,
          services: u.tenant.services.map((s) => ({
            id: s.id,
            serviceName: s.service.name,
            monthlyFee: Number(s.monthlyFee),
          })),
        }
      : null,
  }));

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
