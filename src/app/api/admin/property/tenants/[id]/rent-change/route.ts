import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { effectiveDate, newRent, reason } = body as {
    effectiveDate: string;
    newRent: number;
    reason?: string;
  };

  if (!effectiveDate || newRent == null) {
    return Response.json({ error: "effectiveDate and newRent are required" }, { status: 400 });
  }

  const tenant = await db.tenant.findUnique({
    where: { id },
    include: { unit: { select: { monthlyRent: true } } },
  });

  if (!tenant) return Response.json({ error: "Tenant not found" }, { status: 404 });

  const previousRent = tenant.unit ? Number(tenant.unit.monthlyRent) : 0;

  const rentChange = await db.rentChange.create({
    data: {
      tenantId: id,
      effectiveDate: new Date(effectiveDate),
      previousRent,
      newRent,
      reason: reason ?? null,
      appliedAt: null,
    },
  });

  return Response.json({
    data: {
      ...rentChange,
      previousRent: Number(rentChange.previousRent),
      newRent: Number(rentChange.newRent),
      effectiveDate: rentChange.effectiveDate.toISOString(),
      appliedAt: null,
    },
  });
}
