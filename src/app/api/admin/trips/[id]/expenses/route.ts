import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { TripCategory } from "@prisma/client";
import { listTripExpenses, createTripExpense } from "@/services/trips";

// GET a trip's expenses; POST a new trip expense (a DEBIT on a real account).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await listTripExpenses(id);
  return Response.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.category || !Object.prototype.hasOwnProperty.call(TripCategory, body.category)) {
    return Response.json({ error: "Valid category is required" }, { status: 400 });
  }
  if (!body.accountId) return Response.json({ error: "accountId is required" }, { status: 400 });
  try {
    const data = await createTripExpense({
      tripId: id,
      tripCategory: body.category as TripCategory,
      accountId: String(body.accountId),
      amount: Number(body.amount),
      date: String(body.date),
      description: body.description ?? null,
      notes: body.notes ?? null,
      ...(body.fxRate != null && { fxRate: Number(body.fxRate) }),
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
