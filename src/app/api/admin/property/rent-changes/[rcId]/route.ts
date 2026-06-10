import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateRentChange, deleteRentChange } from "@/services/property";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ rcId: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rcId } = await params;
  const body = await req.json();
  try {
    const data = await updateRentChange(rcId, body);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ rcId: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rcId } = await params;
  try {
    const data = await deleteRentChange(rcId);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
