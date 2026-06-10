import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const tenant = await db.tenant.findUnique({ where: { id } });
  if (!tenant) return Response.json({ error: "Not found" }, { status: 404 });
  if (tenant.isActive) return Response.json({ error: "Tenant is already active" }, { status: 400 });

  await db.tenant.update({
    where: { id },
    data: { isActive: true, moveOutDate: null },
  });

  return Response.json({ data: { ok: true } });
}
