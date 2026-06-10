import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const tenant = await db.tenant.findUnique({ where: { id }, select: { unitId: true } });
  if (!tenant) return Response.json({ error: "Not found" }, { status: 404 });

  await db.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id },
      data: { isActive: false, unitId: null, moveOutDate: new Date() },
    });
    if (tenant.unitId) {
      await tx.unit.update({ where: { id: tenant.unitId }, data: { isOccupied: false } });
    }
  });

  return Response.json({ data: { deactivated: true } });
}
