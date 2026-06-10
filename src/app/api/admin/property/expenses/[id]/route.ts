import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateExpense, deleteExpense } from "@/services/property";
import { ExpenseCategory } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data = await updateExpense(id, {
    ...body,
    ...(body.category && { category: body.category as ExpenseCategory }),
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteExpense(id);
  return Response.json({ data });
}
