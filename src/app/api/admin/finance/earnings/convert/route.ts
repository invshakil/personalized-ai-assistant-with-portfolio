import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { convertEarnings } from "@/services/finance";

// POST /api/admin/finance/earnings/convert — realize pending foreign earnings to
// BDT at the actual rate, posting one cross-currency Money transfer for the batch.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { earningIds, fromAccountId, toAccountId, date, toAmount, notes } = body;
  if (!Array.isArray(earningIds) || earningIds.length === 0) {
    return Response.json({ error: "earningIds is required" }, { status: 400 });
  }
  if (!fromAccountId || !toAccountId || !date || toAmount == null) {
    return Response.json(
      { error: "fromAccountId, toAccountId, date and toAmount are required" },
      { status: 400 }
    );
  }

  try {
    const data = await convertEarnings({
      earningIds,
      fromAccountId,
      toAccountId,
      date,
      toAmount: Number(toAmount),
      notes: notes ?? null,
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
