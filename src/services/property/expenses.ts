import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";
import { recordLinkedEntry } from "@/services/money";
import { ExpenseCategory } from "@prisma/client";

export interface GetExpensesOptions {
  month?: number;
  year?: number;
  payeeIds?: string[];
  categories?: ExpenseCategory[];
  serviceTypeIds?: string[];
  /** Case-insensitive search on description or notes. */
  q?: string;
}

export async function getExpenses(opts: GetExpensesOptions) {
  const { month, year, payeeIds, categories, serviceTypeIds, q } = opts;
  const expenses = await db.expense.findMany({
    where: {
      ...(month && { month }),
      ...(year && { year }),
      ...(payeeIds?.length && { payeeId: { in: payeeIds } }),
      ...(categories?.length && { category: { in: categories } }),
      ...(serviceTypeIds?.length && { serviceTypeId: { in: serviceTypeIds } }),
      ...(q && {
        OR: [
          { description: { contains: q, mode: "insensitive" } },
          { notes: { contains: q, mode: "insensitive" } },
        ],
      }),
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
  /**
   * Optional Money-Manager account to debit when the expense is actually paid.
   * Opt-in: when set, a linked ledger DEBIT is posted so the cash leaves that
   * account's balance. No back-sync — editing/deleting the expense later does
   * not touch the ledger entry.
   */
  accountId?: string;
}

export async function createExpense(input: CreateExpenseInput) {
  // The expense and its opt-in ledger entry are one unit of work — a failing
  // link must not leave the expense recorded with no cash movement behind it.
  const expense = await db.$transaction(async (tx) => {
    const created = await tx.expense.create({
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

    // Opt-in cross-domain link: post a ledger DEBIT only when the caller supplied
    // an account. Posted once at create time; no back-sync.
    if (input.accountId) {
      await recordLinkedEntry(
        {
          accountId: input.accountId,
          direction: "DEBIT",
          amount: input.amount,
          date: input.expenseDate ?? `${input.year}-${String(input.month).padStart(2, "0")}-01`,
          categoryName: "Property Expense",
          description: input.description,
        },
        tx
      );
    }

    return created;
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
