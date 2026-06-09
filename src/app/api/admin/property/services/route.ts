import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const services = await db.addOnService.findMany({
    orderBy: { name: "asc" },
    include: {
      tenants: {
        where: { isActive: true },
        include: {
          tenant: { select: { id: true, tenantCode: true, name: true } },
        },
      },
    },
  });

  const data = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    isActive: s.isActive,
    assignedCount: s.tenants.length,
    tenants: s.tenants.map((ts) => ({
      id: ts.id,
      tenantId: ts.tenantId,
      tenantCode: ts.tenant.tenantCode,
      tenantName: ts.tenant.name,
      monthlyFee: Number(ts.monthlyFee),
      startDate: ts.startDate.toISOString(),
      endDate: ts.endDate?.toISOString() ?? null,
    })),
  }));

  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return Response.json({ error: "name is required" }, { status: 400 });

  const service = await db.addOnService.create({
    data: { name, description: description ?? null, isActive: true },
  });

  return Response.json({ data: service }, { status: 201 });
}
