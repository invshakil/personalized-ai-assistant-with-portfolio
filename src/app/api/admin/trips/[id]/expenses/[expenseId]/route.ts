import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { updateTripExpense, deleteTripExpense } from "@/services/trips";
import { parseExpenseBody, type RawExpenseBody } from "../_body";

// PUT fully replaces a trip expense (recomputes shares + reconciles the linked
// MoneyEntry); DELETE removes it (and any linked MoneyEntry).
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, expenseId } = await params;
  const body = (await req.json().catch(() => null)) as RawExpenseBody | null;
  const parsed = parseExpenseBody(body);
  if ("error" in parsed) return Response.json({ error: parsed.error }, { status: 400 });
  try {
    const data = await updateTripExpense(id, expenseId, parsed.input);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id, expenseId } = await params;
  try {
    const data = await deleteTripExpense(id, expenseId);
    return Response.json({ data });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Failed" }, { status: 400 });
  }
}
