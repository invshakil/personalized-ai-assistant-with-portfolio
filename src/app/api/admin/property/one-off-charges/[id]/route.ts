import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateOneOffCharge, deleteOneOffCharge } from "@/services/property";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { label, amount, notes } = body as {
    label?: string;
    amount?: number;
    notes?: string | null;
  };
  try {
    const data = await updateOneOffCharge(id, { label, amount, notes });
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await deleteOneOffCharge(id);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
