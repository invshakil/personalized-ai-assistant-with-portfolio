import { db } from "@/lib/db";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { resolveRange, dateColumnWhere } from "@/services/_shared/dateRange";
import { toNum, toIso } from "./_serializers";
import { generateSubscriptionCharges } from "./subscriptions";

export interface GetBizExpensesOptions {
  fiscalYear?: string;
  categoryId?: string;
  /** Case-insensitive free-text search over the tool/service name. */
  q?: string;
  /** Relative period token (resolved server-side) — e.g. "last_3_months". */
  period?: string;
  /** Explicit inclusive date bounds (override `period`). ISO yyyy-mm-dd. */
  from?: string;
  to?: string;
}

export async function getBizExpenses(opts: GetBizExpensesOptions = {}) {
  // Make sure any due subscription charges exist before listing.
  await generateSubscriptionCharges();
  const range = resolveRange({ period: opts.period, from: opts.from, to: opts.to });
  const q = opts.q?.trim();
  const expenses = await db.bizExpense.findMany({
    where: {
      ...(opts.fiscalYear && { fiscalYear: opts.fiscalYear }),
      ...(opts.categoryId && { categoryId: opts.categoryId }),
      ...(q && { name: { contains: q, mode: "insensitive" } }),
      ...dateColumnWhere(range),
    },
    orderBy: [{ date: "desc" }],
    include: { category: { select: { name: true } } },
  });
  return expenses.map((b) => ({
    id: b.id,
    date: toIso(b.date),
    name: b.name,
    categoryId: b.categoryId,
    categoryName: b.category.name,
    isRecurring: b.isRecurring,
    amount: toNum(b.amount),
    fiscalYear: b.fiscalYear,
    notes: b.notes,
    subscriptionId: b.subscriptionId,
  }));
}

export interface CreateBizExpenseInput {
  date: string;
  name: string;
  categoryId: string;
  isRecurring?: boolean;
  amount: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function createBizExpense(input: CreateBizExpenseInput) {
  const date = new Date(input.date);
  const expense = await db.bizExpense.create({
    data: {
      date,
      name: input.name,
      categoryId: input.categoryId,
      isRecurring: input.isRecurring ?? false,
      amount: input.amount,
      fiscalYear: input.fiscalYear || fiscalYearOf(date),
      notes: input.notes ?? null,
    },
  });
  return { ...expense, amount: toNum(expense.amount), date: toIso(expense.date) };
}

export interface UpdateBizExpenseInput {
  date?: string;
  name?: string;
  categoryId?: string;
  isRecurring?: boolean;
  amount?: number;
  fiscalYear?: string;
  notes?: string | null;
}

export async function updateBizExpense(id: string, input: UpdateBizExpenseInput) {
  const nextDate = input.date ? new Date(input.date) : undefined;
  const expense = await db.bizExpense.update({
    where: { id },
    data: {
      ...(nextDate && { date: nextDate }),
      ...(input.name && { name: input.name }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.isRecurring != null && { isRecurring: input.isRecurring }),
      ...(input.amount != null && { amount: input.amount }),
      ...(input.fiscalYear
        ? { fiscalYear: input.fiscalYear }
        : nextDate
          ? { fiscalYear: fiscalYearOf(nextDate) }
          : {}),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  return { ...expense, amount: toNum(expense.amount), date: toIso(expense.date) };
}

export async function deleteBizExpense(id: string) {
  await db.bizExpense.delete({ where: { id } });
  return { deleted: true };
}
