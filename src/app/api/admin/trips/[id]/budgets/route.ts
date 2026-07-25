import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { TripCategory } from "@prisma/client";
import { getTripBudgets, setTripBudget } from "@/services/trips";

// GET budgets for a trip; PUT upserts one category's planned amount (BDT).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const data = await getTripBudgets(id);
  return Response.json({ data });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.category || !Object.prototype.hasOwnProperty.call(TripCategory, body.category)) {
    return Response.json({ error: "Valid category is required" }, { status: 400 });
  }
  try {
    const data = await setTripBudget(
      id,
      body.category as TripCategory,
      Number(body.plannedAmount ?? 0)
    );
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
