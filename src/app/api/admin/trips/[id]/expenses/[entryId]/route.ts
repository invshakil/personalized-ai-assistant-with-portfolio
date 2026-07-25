import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { TripCategory } from "@prisma/client";
import { updateTripExpense, deleteTripExpense } from "@/services/trips";

// PUT / DELETE a single trip expense (a MoneyEntry).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, entryId } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ error: "Invalid body" }, { status: 400 });
  if (body.category && !Object.prototype.hasOwnProperty.call(TripCategory, body.category)) {
    return Response.json({ error: "Invalid category" }, { status: 400 });
  }
  try {
    const data = await updateTripExpense(id, entryId, {
      ...(body.amount != null && { amount: Number(body.amount) }),
      ...(body.date && { date: String(body.date) }),
      ...(body.category && { tripCategory: body.category as TripCategory }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.notes !== undefined && { notes: body.notes }),
    });
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, entryId } = await params;
  const data = await deleteTripExpense(id, entryId);
  return Response.json({ data });
}
