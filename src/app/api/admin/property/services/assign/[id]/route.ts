import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const record = await db.tenantService.update({
    where: { id },
    data: {
      ...(body.monthlyFee != null && { monthlyFee: body.monthlyFee }),
      ...(body.endDate !== undefined && { endDate: body.endDate ? new Date(body.endDate) : null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  return Response.json({
    data: {
      ...record,
      monthlyFee: Number(record.monthlyFee),
      startDate: record.startDate.toISOString(),
      endDate: record.endDate?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const record = await db.tenantService.update({
    where: { id },
    data: { isActive: false, endDate: new Date() },
  });

  return Response.json({
    data: {
      ...record,
      monthlyFee: Number(record.monthlyFee),
      startDate: record.startDate.toISOString(),
      endDate: record.endDate?.toISOString() ?? null,
    },
  });
}
