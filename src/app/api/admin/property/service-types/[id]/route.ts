import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ExpenseCategory } from "@prisma/client";
import { NextRequest } from "next/server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { name, category, description, isActive } = body;

  const data = await db.propertyServiceType.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(category && { category: category as ExpenseCategory }),
      ...(description !== undefined && { description: description ?? null }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.propertyServiceType.update({ where: { id }, data: { isActive: false } });
  return Response.json({ data: { deactivated: true } });
}
