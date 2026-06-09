import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId, serviceId, monthlyFee, startDate, notes } = await req.json();

  if (!tenantId || !serviceId || monthlyFee == null || !startDate) {
    return Response.json({ error: "tenantId, serviceId, monthlyFee, startDate are required" }, { status: 400 });
  }

  // If a previous subscription exists (ended), allow re-creating; otherwise create fresh
  const existing = await db.tenantService.findUnique({
    where: { tenantId_serviceId: { tenantId, serviceId } },
  });

  let record;
  if (existing) {
    record = await db.tenantService.update({
      where: { tenantId_serviceId: { tenantId, serviceId } },
      data: {
        monthlyFee,
        startDate: new Date(startDate),
        endDate: null,
        isActive: true,
        notes: notes ?? null,
      },
    });
  } else {
    record = await db.tenantService.create({
      data: {
        tenantId,
        serviceId,
        monthlyFee,
        startDate: new Date(startDate),
        isActive: true,
        notes: notes ?? null,
      },
    });
  }

  return Response.json({
    data: {
      ...record,
      monthlyFee: Number(record.monthlyFee),
      startDate: record.startDate.toISOString(),
      endDate: record.endDate?.toISOString() ?? null,
    },
  }, { status: 201 });
}
