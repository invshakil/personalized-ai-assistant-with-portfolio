import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateCategory, deleteCategory } from "@/services/money";
import { MoneyCategoryKind } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  if (body.kind && !(body.kind in MoneyCategoryKind)) {
    return Response.json({ error: "kind must be INCOME or EXPENSE" }, { status: 400 });
  }
  const data = await updateCategory(id, {
    ...body,
    ...(body.kind && { kind: body.kind as MoneyCategoryKind }),
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteCategory(id);
  return Response.json({ data });
}
