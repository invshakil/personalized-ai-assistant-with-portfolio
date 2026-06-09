import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest } from "next/server";
import { ExpenseCategory } from "@prisma/client";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const expense = await db.expense.update({
    where: { id },
    data: {
      ...(body.description && { description: body.description }),
      ...(body.amount != null && { amount: body.amount }),
      ...(body.category && { category: body.category as ExpenseCategory }),
      ...(body.month != null && { month: body.month }),
      ...(body.year != null && { year: body.year }),
      ...(body.expenseDate !== undefined && {
        expenseDate: body.expenseDate ? new Date(body.expenseDate) : null,
      }),
      ...(body.paidTo !== undefined && { paidTo: body.paidTo }),
      ...(body.paymentMode !== undefined && { paymentMode: body.paymentMode }),
      ...(body.unitId !== undefined && { unitId: body.unitId }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  });

  return Response.json({ data: { ...expense, amount: Number(expense.amount) } });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db.expense.delete({ where: { id } });
  return Response.json({ data: { deleted: true } });
}
