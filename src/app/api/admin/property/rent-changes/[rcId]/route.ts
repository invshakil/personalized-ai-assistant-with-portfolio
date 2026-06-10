import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ rcId: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rcId } = await params;
  const body = await req.json();
  const { effectiveDate, newRent, reason } = body as {
    effectiveDate?: string;
    newRent?: number;
    reason?: string | null;
  };

  const rc = await db.rentChange.findUnique({ where: { id: rcId } });
  if (!rc) return Response.json({ error: "Not found" }, { status: 404 });
  if (rc.appliedAt) return Response.json({ error: "Cannot edit a rent change that has already been applied" }, { status: 400 });

  const updated = await db.rentChange.update({
    where: { id: rcId },
    data: {
      ...(effectiveDate && { effectiveDate: new Date(effectiveDate) }),
      ...(newRent != null && { newRent }),
      ...(reason !== undefined && { reason: reason ?? null }),
    },
  });

  return Response.json({
    data: {
      ...updated,
      previousRent: Number(updated.previousRent),
      newRent: Number(updated.newRent),
      effectiveDate: updated.effectiveDate.toISOString(),
      appliedAt: updated.appliedAt?.toISOString() ?? null,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ rcId: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rcId } = await params;

  const rc = await db.rentChange.findUnique({ where: { id: rcId } });
  if (!rc) return Response.json({ error: "Not found" }, { status: 404 });
  if (rc.appliedAt) return Response.json({ error: "Cannot delete a rent change that has already been applied" }, { status: 400 });

  await db.rentChange.delete({ where: { id: rcId } });

  return Response.json({ data: { ok: true } });
}
