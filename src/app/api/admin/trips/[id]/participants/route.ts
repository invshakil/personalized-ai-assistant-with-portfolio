import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listParticipants, createParticipant } from "@/services/trips";

// GET a trip's participants; POST a new travel-mate.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await listParticipants(id);
  return Response.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.name?.trim()) return Response.json({ error: "name is required" }, { status: 400 });
  try {
    const data = await createParticipant({
      tripId: id,
      name: String(body.name),
      isSelf: Boolean(body.isSelf),
      beneficiaryId: body.beneficiaryId ? String(body.beneficiaryId) : null,
      note: body.note ?? null,
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
