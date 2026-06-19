import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { recordPayment } from "@/services/money";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { amount, date } = body;
  if (amount == null || !date) {
    return Response.json({ error: "amount and date are required" }, { status: 400 });
  }
  if (body.direction && body.direction !== "DEBIT" && body.direction !== "CREDIT") {
    return Response.json({ error: "direction must be DEBIT or CREDIT" }, { status: 400 });
  }
  try {
    const data = await recordPayment({
      beneficiaryId: id,
      amount: Number(amount),
      date,
      obligationId: body.obligationId ?? null,
      direction: body.direction,
      accountId: body.accountId ?? null,
      categoryId: body.categoryId ?? null,
      description: body.description ?? null,
      notes: body.notes ?? null,
    });
    return Response.json({ data }, { status: 201 });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
