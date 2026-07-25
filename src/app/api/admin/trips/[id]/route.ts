import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getTrip, updateTrip, deleteTrip } from "@/services/trips";

// GET / PUT / DELETE a single trip.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await getTrip(id);
  if (!data) return Response.json({ error: "Trip not found" }, { status: 404 });
  return Response.json({ data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });
  try {
    const data = await updateTrip(id, body);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await deleteTrip(id);
  return Response.json({ data });
}
