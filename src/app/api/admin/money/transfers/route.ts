import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { recordTransfer } from "@/services/money";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { fromAccountId, toAccountId, amount, date } = body;
  if (!fromAccountId || !toAccountId || amount == null || !date) {
    return Response.json(
      { error: "fromAccountId, toAccountId, amount and date are required" },
      { status: 400 }
    );
  }
  try {
    const data = await recordTransfer({
      fromAccountId,
      toAccountId,
      amount: Number(amount),
      date,
      description: body.description ?? null,
      notes: body.notes ?? null,
      ...(body.toAmount != null && { toAmount: Number(body.toAmount) }),
      ...(body.fee != null && { fee: Number(body.fee) }),
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
