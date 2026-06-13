import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";
import { ExpenseCategory } from "@prisma/client";

export async function getExpenses(opts: { month?: number; year?: number; payeeId?: string }) {
  const { month, year, payeeId } = opts;
  const expenses = await db.expense.findMany({
    where: {
      ...(month && { month }),
      ...(year && { year }),
      ...(payeeId && { payeeId }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { expenseDate: "desc" }],
    include: {
      unit: { select: { unitNumber: true } },
      payee: { select: { name: true } },
      serviceType: { select: { name: true } },
    },
  });
  return expenses.map((e) => ({
    ...e,
    amount: toNum(e.amount),
    expenseDate: toIso(e.expenseDate),
    unitNumber: e.unit?.unitNumber ?? null,
    payeeName: e.payee?.name ?? null,
    serviceTypeName: e.serviceType?.name ?? null,
  }));
}

export interface CreateExpenseInput {
  description: string;
  amount: number;
  category: ExpenseCategory;
  month: number;
  year: number;
  expenseDate?: string | null;
  paidTo?: string | null;
  paymentMode?: string | null;
  unitId?: string | null;
  payeeId?: string | null;
  serviceTypeId?: string | null;
  notes?: string | null;
}

export async function createExpense(input: CreateExpenseInput) {
  const expense = await db.expense.create({
    data: {
      description: input.description,
      amount: input.amount,
      currency: "BDT",
      category: input.category,
      month: input.month,
      year: input.year,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
      paidTo: input.paidTo ?? null,
      paymentMode: input.paymentMode ?? null,
      unitId: input.unitId ?? null,
      payeeId: input.payeeId ?? null,
      serviceTypeId: input.serviceTypeId ?? null,
      notes: input.notes ?? null,
    },
    include: {
      payee: { select: { name: true } },
      serviceType: { select: { name: true } },
    },
  });
  return {
    ...expense,
    amount: toNum(expense.amount),
    payeeName: expense.payee?.name ?? null,
    serviceTypeName: expense.serviceType?.name ?? null,
  };
}

export interface UpdateExpenseInput {
  description?: string;
  amount?: number;
  category?: ExpenseCategory;
  month?: number;
  year?: number;
  expenseDate?: string | null;
  paidTo?: string | null;
  paymentMode?: string | null;
  unitId?: string | null;
  payeeId?: string | null;
  serviceTypeId?: string | null;
  notes?: string | null;
}

export async function updateExpense(id: string, input: UpdateExpenseInput) {
  const expense = await db.expense.update({
    where: { id },
    data: {
      ...(input.description && { description: input.description }),
      ...(input.amount != null && { amount: input.amount }),
      ...(input.category && { category: input.category }),
      ...(input.month != null && { month: input.month }),
      ...(input.year != null && { year: input.year }),
      ...(input.expenseDate !== undefined && {
        expenseDate: input.expenseDate ? new Date(input.expenseDate) : null,
      }),
      ...(input.paidTo !== undefined && { paidTo: input.paidTo }),
      ...(input.paymentMode !== undefined && { paymentMode: input.paymentMode }),
      ...(input.unitId !== undefined && { unitId: input.unitId }),
      ...(input.payeeId !== undefined && { payeeId: input.payeeId }),
      ...(input.serviceTypeId !== undefined && { serviceTypeId: input.serviceTypeId }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return { ...expense, amount: toNum(expense.amount) };
}

export async function deleteExpense(id: string) {
  await db.expense.delete({ where: { id } });
  return { deleted: true };
}
