import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { fundTripWallet } from "@/services/trips";

// POST — fund the trip wallet (cross-currency transfer from a home account).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.fromAccountId || !body?.toAccountId) {
    return Response.json({ error: "fromAccountId and toAccountId are required" }, { status: 400 });
  }
  try {
    const data = await fundTripWallet({
      tripId: id,
      fromAccountId: String(body.fromAccountId),
      toAccountId: String(body.toAccountId),
      amount: Number(body.amount),
      ...(body.toAmount != null && { toAmount: Number(body.toAmount) }),
      date: String(body.date),
      notes: body.notes ?? null,
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
