import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();

  // Find all CURRENT active tenants whose lease has ended
  const expired = await db.tenant.findMany({
    where: {
      isActive: true,
      tenantStatus: "CURRENT",
      leaseEndDate: { lt: now },
    },
    select: { id: true, unitId: true },
  });

  if (expired.length === 0) return Response.json({ data: { deactivated: 0 } });

  let deactivated = 0;
  let promoted = 0;

  for (const tenant of expired) {
    const unitId = tenant.unitId;

    const futureTenant = unitId
      ? await db.tenant.findFirst({
          where: { unitId, tenantStatus: "FUTURE", isActive: true, id: { not: tenant.id } },
          select: { id: true },
        })
      : null;

    await db.$transaction(async (tx) => {
      await tx.tenant.update({
        where: { id: tenant.id },
        data: { isActive: false, tenantStatus: "PAST", unitId: null, moveOutDate: now },
      });

      if (futureTenant) {
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

  return Response.json({ data: { deactivated, promoted } });
}
