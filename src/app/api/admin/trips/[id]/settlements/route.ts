import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listSettlements, createSettlement } from "@/services/trips";

// GET a trip's settlements (collect fund / settle up); POST a new one.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await listSettlements(id);
  return Response.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.fromParticipantId || !body?.toParticipantId) {
    return Response.json(
      { error: "fromParticipantId and toParticipantId are required" },
      { status: 400 }
    );
  }
  try {
    const data = await createSettlement({
      tripId: id,
      date: String(body.date),
      fromParticipantId: String(body.fromParticipantId),
      toParticipantId: String(body.toParticipantId),
      amount: Number(body.amount),
      ...(body.currency && { currency: String(body.currency) }),
      ...(body.fxRate != null && { fxRate: Number(body.fxRate) }),
      note: body.note ?? null,
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
