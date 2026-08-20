import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getBizExpenses, createBizExpense } from "@/services/finance";
import { withApiError } from "@/lib/apiRoute";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fiscalYears = searchParams.get("fiscalYears")?.split(",").filter(Boolean);
  const categoryIds = searchParams.get("categoryIds")?.split(",").filter(Boolean);
  const period = searchParams.get("period") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const q = searchParams.get("q") ?? undefined;

  const data = await getBizExpenses({ fiscalYears, categoryIds, period, from, to, q });
  return Response.json({ data });
}

export const POST = withApiError(async (req: NextRequest) => {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, name, categoryId, isRecurring, amount, fiscalYear, notes, accountId } = body;

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
    accountId: accountId || undefined,
  });
  return Response.json({ data }, { status: 201 });
});
