import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getUnit, updateUnit, deleteUnit } from "@/services/property";
import { withApiError } from "@/lib/apiRoute";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const data = await getUnit(id);
  if (!data) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data });
}

export const PUT = withApiError(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const data = await updateUnit(id, body);
    return Response.json({ data });
  }
);

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  try {
    const data = await deleteUnit(id);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
