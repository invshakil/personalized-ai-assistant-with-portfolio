import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateBizExpense, deleteBizExpense } from "@/services/finance";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data = await updateBizExpense(id, {
    ...body,
    ...(body.amount != null && { amount: Number(body.amount) }),
    ...(body.isRecurring != null && { isRecurring: Boolean(body.isRecurring) }),
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await deleteBizExpense(id);
  return Response.json({ data });
}
