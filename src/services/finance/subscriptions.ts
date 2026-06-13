import { db } from "@/lib/db";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { toNum, toIso } from "./_serializers";

// Normalize any date to midnight on the 1st of its month.
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

/**
 * Ensure every active month of every subscription has exactly one BizExpense
 * charge. Idempotent — safe to call on every page load. Charges are dated the
 * 1st of their month and deduped by the (subscriptionId, date) unique index.
 */
export async function generateSubscriptionCharges(): Promise<{ created: number }> {
  const subs = await db.subscription.findMany();
  const today = monthStart(new Date());
  let created = 0;

  for (const sub of subs) {
    const start = monthStart(sub.startDate);
    const end = sub.endDate ? monthStart(sub.endDate) : today;
    for (let cursor = start; cursor <= end; cursor = addMonth(cursor)) {
      const date = new Date(cursor);
      const existing = await db.bizExpense.findUnique({
        where: { subscriptionId_date: { subscriptionId: sub.id, date } },
      });
      if (existing) continue;
      await db.bizExpense.create({
        data: {
          date,
          name: sub.name,
          categoryId: sub.categoryId,
          isRecurring: true,
          amount: sub.monthlyAmount,
          fiscalYear: fiscalYearOf(date),
          subscriptionId: sub.id,
        },
      });
      created++;
    }
  }
  return { created };
}

export async function getSubscriptions() {
  await generateSubscriptionCharges();
  const subs = await db.subscription.findMany({
    orderBy: [{ endDate: "asc" }, { startDate: "desc" }],
    include: {
      category: { select: { name: true } },
      charges: { select: { amount: true } },
    },
  });
  return subs.map((s) => ({
    id: s.id,
    name: s.name,
    categoryId: s.categoryId,
    categoryName: s.category.name,
    monthlyAmount: toNum(s.monthlyAmount),
    startDate: toIso(s.startDate),
    endDate: toIso(s.endDate),
    isActive: s.endDate === null,
    notes: s.notes,
    monthsCharged: s.charges.length,
    totalSpent: s.charges.reduce((sum, c) => sum + toNum(c.amount), 0),
  }));
}

export async function getSubscriptionDetail(id: string) {
  const sub = await db.subscription.findUnique({
    where: { id },
    include: { category: { select: { name: true } } },
  });
  if (!sub) return null;
  const charges = await db.bizExpense.findMany({
    where: { subscriptionId: id },
    orderBy: { date: "desc" },
    select: { id: true, date: true, amount: true, fiscalYear: true },
  });
  return {
    id: sub.id,
    name: sub.name,
    categoryId: sub.categoryId,
    categoryName: sub.category.name,
    monthlyAmount: toNum(sub.monthlyAmount),
    startDate: toIso(sub.startDate),
    endDate: toIso(sub.endDate),
    isActive: sub.endDate === null,
    notes: sub.notes,
    totalSpent: charges.reduce((sum, c) => sum + toNum(c.amount), 0),
    charges: charges.map((c) => ({
      id: c.id,
      date: toIso(c.date),
      amount: toNum(c.amount),
      fiscalYear: c.fiscalYear,
    })),
  };
}

export interface CreateSubscriptionInput {
  name: string;
  categoryId: string;
  monthlyAmount: number;
  startDate: string;
  notes?: string | null;
}

export async function createSubscription(input: CreateSubscriptionInput) {
  const sub = await db.subscription.create({
    data: {
      name: input.name,
      categoryId: input.categoryId,
      monthlyAmount: input.monthlyAmount,
      startDate: monthStart(new Date(input.startDate)),
      notes: input.notes ?? null,
    },
  });
  await generateSubscriptionCharges();
  return { id: sub.id };
}

export interface UpdateSubscriptionInput {
  name?: string;
  categoryId?: string;
  monthlyAmount?: number;
  startDate?: string;
  notes?: string | null;
}

export async function updateSubscription(id: string, input: UpdateSubscriptionInput) {
  await db.subscription.update({
    where: { id },
    data: {
      ...(input.name && { name: input.name }),
      ...(input.categoryId && { categoryId: input.categoryId }),
      ...(input.monthlyAmount != null && { monthlyAmount: input.monthlyAmount }),
      ...(input.startDate && { startDate: monthStart(new Date(input.startDate)) }),
      ...(input.notes !== undefined && { notes: input.notes }),
    },
  });
  await generateSubscriptionCharges();
  return { updated: true };
}

/**
 * Stop a subscription effective the given month (defaults to the current
 * month). The end month is still charged; any later charges are removed.
 */
export async function stopSubscription(id: string, endDate?: string) {
  const end = monthStart(endDate ? new Date(endDate) : new Date());
  await db.$transaction(async (tx) => {
    await tx.subscription.update({ where: { id }, data: { endDate: end } });
    // Remove charges beyond the stop month (if the subscription ran ahead).
    await tx.bizExpense.deleteMany({ where: { subscriptionId: id, date: { gt: end } } });
  });
  await generateSubscriptionCharges();
  return { stopped: true };
}

/** Resume a stopped subscription — clears the end date and back-fills charges. */
export async function resumeSubscription(id: string) {
  await db.subscription.update({ where: { id }, data: { endDate: null } });
  await generateSubscriptionCharges();
  return { resumed: true };
}

export async function deleteSubscription(id: string) {
  // Charges cascade-delete via the FK.
  await db.subscription.delete({ where: { id } });
  return { deleted: true };
}
