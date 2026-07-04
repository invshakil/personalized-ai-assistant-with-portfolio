import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { moveTenant } from "@/services/property";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { newUnitId } = body;

  if (!newUnitId) {
    return Response.json({ error: "newUnitId is required" }, { status: 400 });
  }

  try {
    const data = await moveTenant(id, body);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
