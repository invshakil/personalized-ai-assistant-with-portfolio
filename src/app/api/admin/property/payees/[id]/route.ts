import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await db.payee.findUnique({ where: { id } });
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, role, phone, email, address, nidNumber, notes, isActive } = body;

  const data = await db.payee.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(role && { role }),
      ...(phone !== undefined && { phone: phone ?? null }),
      ...(email !== undefined && { email: email ?? null }),
      ...(address !== undefined && { address: address ?? null }),
      ...(nidNumber !== undefined && { nidNumber: nidNumber ?? null }),
      ...(notes !== undefined && { notes: notes ?? null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.payee.update({ where: { id }, data: { isActive: false } });
  return Response.json({ data: { deactivated: true } });
}
