import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { ExpenseCategory } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;

  const expenses = await db.expense.findMany({
    where: {
      ...(month && { month }),
      ...(year && { year }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { expenseDate: "desc" }],
    include: { unit: { select: { unitNumber: true } } },
  });

  const data = expenses.map((e) => ({
    ...e,
    amount: Number(e.amount),
    expenseDate: e.expenseDate?.toISOString() ?? null,
    unitNumber: e.unit?.unitNumber ?? null,
  }));

  return Response.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { description, amount, category, month, year, expenseDate, paidTo, paymentMode, unitId, notes } = body;

  if (!description || !amount || !category || !month || !year) {
    return Response.json({ error: "description, amount, category, month, year are required" }, { status: 400 });
  }

  const expense = await db.expense.create({
    data: {
      description,
      amount,
      currency: "BDT",
      category: category as ExpenseCategory,
      month,
      year,
      expenseDate: expenseDate ? new Date(expenseDate) : null,
      paidTo: paidTo ?? null,
      paymentMode: paymentMode ?? null,
      unitId: unitId ?? null,
      notes: notes ?? null,
    },
  });

  return Response.json({ data: { ...expense, amount: Number(expense.amount) } }, { status: 201 });
}
