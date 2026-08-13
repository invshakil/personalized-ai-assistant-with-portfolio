import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { listTripExpenses, createTripExpense } from "@/services/trips";
import { TRIP_CATEGORIES, type TripCategory } from "@/types";
import { parseExpenseBody, type RawExpenseBody } from "./_body";

// GET a trip's split-ledger expenses; POST a new one (may post a MoneyEntry — see service).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const data = await listTripExpenses(id, {
    // Only pass a category the enum actually knows; an unknown value would make
    // Prisma throw rather than simply matching nothing.
    category: TRIP_CATEGORIES.includes(category as TripCategory)
      ? (category as TripCategory)
      : undefined,
    payerId: searchParams.get("payerId") ?? undefined,
    q: searchParams.get("q") ?? undefined,
  });
  return Response.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as RawExpenseBody | null;
  const parsed = parseExpenseBody(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const data = await createTripExpense({ tripId: id, ...parsed.input });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
