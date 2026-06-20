import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBizExpenses, createBizExpense } from "@/services/finance";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fiscalYear = searchParams.get("fiscalYear") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const data = await getBizExpenses({ fiscalYear, categoryId, period, from, to, q });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, name, categoryId, isRecurring, amount, fiscalYear, notes } = body;

  if (!date || !name || !categoryId || amount == null) {
    return Response.json(
      { error: "date, name, categoryId and amount are required" },
      { status: 400 }
    );
  }

  const data = await createBizExpense({
    date,
    name,
    categoryId,
    isRecurring: Boolean(isRecurring),
    amount: Number(amount),
    fiscalYear,
    notes,
  });
  return Response.json({ data }, { status: 201 });
}
