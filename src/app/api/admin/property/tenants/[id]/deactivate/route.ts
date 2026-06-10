import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenant = await db.tenant.findUnique({ where: { id }, select: { unitId: true, tenantStatus: true } });
  if (!tenant) return Response.json({ error: "Not found" }, { status: 404 });

  const unitId = tenant.unitId;

  // Check if a future tenant is queued for the same unit
  const futureTenant = unitId
    ? await db.tenant.findFirst({
        where: { unitId, tenantStatus: "FUTURE", isActive: true, id: { not: id } },
        select: { id: true },
      })
    : null;

  await db.$transaction(async (tx) => {
    // Deactivate the current tenant
    await tx.tenant.update({
      where: { id },
      data: { isActive: false, tenantStatus: "PAST", unitId: null, moveOutDate: new Date() },
    });

    if (futureTenant) {
      // Promote the future tenant to CURRENT
      await tx.tenant.update({
        where: { id: futureTenant.id },
        data: { tenantStatus: "CURRENT" },
      });
      // Unit stays occupied (future tenant is now current)
    } else if (unitId) {
      // No future tenant — unit is now vacant
      await tx.unit.update({ where: { id: unitId }, data: { isOccupied: false } });
    }
  });

  return Response.json({ data: { deactivated: true, promoted: !!futureTenant } });
}
