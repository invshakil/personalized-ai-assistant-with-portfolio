import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateEmployee, deleteEmployee } from "@/services/finance";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const data = await updateEmployee(id, {
    name: body.name,
    phone: body.phone,
    isActive: body.isActive,
    notes: body.notes,
  });
  return Response.json({ data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await deleteEmployee(id);
  if (!result.deleted) return Response.json({ error: result.error }, { status: 400 });
  return Response.json({ data: result });
}
