import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { publishTrip, unpublishTrip } from "@/services/trips";
import { withApiError } from "@/lib/apiRoute";

// POST — publish the trip's public page; DELETE — hide it (slug kept for re-use).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const data = await publishTrip(id);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export const DELETE = withApiError(
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await auth();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const { id } = await params;
    const data = await unpublishTrip(id);
    return Response.json({ data });
  }
);
