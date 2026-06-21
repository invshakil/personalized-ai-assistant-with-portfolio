import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";
import { getExpenses, createExpense } from "@/services/property";
import { ExpenseCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const payeeId = searchParams.get("payeeId") ?? undefined;
  const serviceTypeId = searchParams.get("serviceTypeId") ?? undefined;
  const categoryParam = searchParams.get("category");
  const category =
    categoryParam && Object.values(ExpenseCategory).includes(categoryParam as ExpenseCategory)
      ? (categoryParam as ExpenseCategory)
      : undefined;
  const q = searchParams.get("q") ?? undefined;

  const data = await getExpenses({ month, year, payeeId, serviceTypeId, category, q });
  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    description,
    amount,
    category,
    month,
    year,
    expenseDate,
    paidTo,
    paymentMode,
    unitId,
    payeeId,
    serviceTypeId,
    notes,
    accountId,
  } = body;

  if (!description || !amount || !category || !month || !year) {
    return Response.json(
      { error: "description, amount, category, month, year are required" },
      { status: 400 }
    );
  }

  const data = await createExpense({
    description,
    amount,
    category: category as ExpenseCategory,
    month,
    year,
    expenseDate,
    paidTo,
    paymentMode,
    unitId,
    payeeId,
    serviceTypeId,
    notes,
    accountId,
  });
  return Response.json({ data }, { status: 201 });
}
