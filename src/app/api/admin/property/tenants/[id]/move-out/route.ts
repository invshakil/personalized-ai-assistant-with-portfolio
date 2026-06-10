import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getMoveOutPreview } from "@/services/property";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { moveOutDate } = await req.json();

  if (!moveOutDate) return Response.json({ error: "moveOutDate is required" }, { status: 400 });

  try {
    const data = await getMoveOutPreview(id, moveOutDate);
    return Response.json({ data });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
