import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const unit = await db.unit.findUnique({
    where: { id },
    include: { tenants: { where: { isActive: true } } },
  });

  if (!unit) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: { ...unit, monthlyRent: Number(unit.monthlyRent) } });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { unitNumber, floor, monthlyRent, description, notes } = body;

  const unit = await db.unit.update({
    where: { id },
    data: {
      ...(unitNumber && { unitNumber }),
      ...(floor && { floor }),
      ...(monthlyRent != null && { monthlyRent }),
      ...(description !== undefined && { description }),
      ...(notes !== undefined && { notes }),
    },
  });

  return Response.json({ data: { ...unit, monthlyRent: Number(unit.monthlyRent) } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const unit = await db.unit.findUnique({ where: { id }, include: { tenants: true } });
  if (!unit) return Response.json({ error: "Not found" }, { status: 404 });
  if (unit.isOccupied) return Response.json({ error: "Cannot delete an occupied unit" }, { status: 400 });

  await db.unit.delete({ where: { id } });
  return Response.json({ data: { deleted: true } });
}
