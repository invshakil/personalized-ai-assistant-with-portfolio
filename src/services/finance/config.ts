import { db } from "@/lib/db";
import { toNum } from "./_serializers";

// ─── Employees ────────────────────────────────────────────────────────────────

export async function getEmployees() {
  const employees = await db.employee.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { payments: true } } },
  });
  // Total ever paid per employee, across all fiscal years.
  const totals = await db.employeePayment.groupBy({
    by: ["employeeId"],
    _sum: { amount: true },
  });
  const totalById = new Map(totals.map((t) => [t.employeeId, toNum(t._sum.amount)]));
  return employees.map((e) => ({
    id: e.id,
    name: e.name,
    phone: e.phone,
    isActive: e.isActive,
    notes: e.notes,
    paymentCount: e._count.payments,
    totalPaid: totalById.get(e.id) ?? 0,
  }));
}

export async function createEmployee(input: {
  name: string;
  phone?: string | null;
  isActive?: boolean;
  notes?: string | null;
}) {
  return db.employee.create({
    data: {
      name: input.name,
      phone: input.phone ?? null,
      isActive: input.isActive ?? true,
      notes: input.notes ?? null,
    },
  });
}

export async function updateEmployee(
  id: string,
  input: { name?: string; phone?: string | null; isActive?: boolean; notes?: string | null }
) {
  return db.employee.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.isActive != null && { isActive: input.isActive }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteEmployee(id: string) {
  const count = await db.employeePayment.count({ where: { employeeId: id } });
  if (count > 0) {
    return { deleted: false, error: `Employee has ${count} payment(s); reassign or delete those first.` };
  }
  await db.employee.delete({ where: { id } });
  return { deleted: true };
}

// ─── Income sources (clients) ───────────────────────────────────────────────

export async function getIncomeSources() {
  const sources = await db.incomeSource.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { earnings: true } } },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    notes: s.notes,
    earningCount: s._count.earnings,
  }));
}

export async function createIncomeSource(input: { name: string; notes?: string | null }) {
  return db.incomeSource.create({ data: { name: input.name, notes: input.notes ?? null } });
}

export async function updateIncomeSource(
  id: string,
  input: { name?: string; notes?: string | null }
) {
  return db.incomeSource.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
}

export async function deleteIncomeSource(id: string) {
  const count = await db.earning.count({ where: { sourceId: id } });
  if (count > 0) {
    return { deleted: false, error: `Source has ${count} earning(s); reassign or delete those first.` };
  }
  await db.incomeSource.delete({ where: { id } });
  return { deleted: true };
}

// ─── Business expense categories ────────────────────────────────────────────

export async function getExpenseCategories() {
  const categories = await db.bizExpenseCategory.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { expenses: true } } },
  });
  return categories.map((c) => ({
    id: c.id,
    name: c.name,
    expenseCount: c._count.expenses,
  }));
}

export async function createExpenseCategory(input: { name: string }) {
  return db.bizExpenseCategory.create({ data: { name: input.name } });
}

export async function updateExpenseCategory(id: string, input: { name?: string }) {
  return db.bizExpenseCategory.update({
    where: { id },
    data: { ...(input.name && { name: input.name }) },
  });
}

export async function deleteExpenseCategory(id: string) {
  const count = await db.bizExpense.count({ where: { categoryId: id } });
  if (count > 0) {
    return { deleted: false, error: `Category has ${count} expense(s); reassign or delete those first.` };
  }
  await db.bizExpenseCategory.delete({ where: { id } });
  return { deleted: true };
}
