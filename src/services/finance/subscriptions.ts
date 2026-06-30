import { db } from "@/lib/db";
import { fiscalYearOf } from "@/lib/fiscalYear";
import { toNum, toIso } from "./_serializers";

// Normalize any date to midnight on the 1st of its month (local time).
function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}
// Parse a "YYYY-MM" or "YYYY-MM-DD" input into local midnight on the 1st of
// that month. Reads literal components — never `new Date(string)`, which parses
// as UTC and shifts the month in negative-offset timezones.
function monthStartFromInput(s: string): Date {
  const [y, m] = s.split("-").map(Number);
  return new Date(y, m - 1, 1);
}
const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

type Decimalish = { toNumber(): number } | number | null;
type RateChange = { effectiveMonth: Date; monthlyAmount: Decimalish };
type Override = { month: Date; amount: Decimalish };

/**
 * The amount charged for a given month: a month override wins; otherwise the
 * latest rate change effective on/before the month; otherwise the base rate.
 */
function effectiveAmountFor(
  month: Date,
  base: number,
  rateChanges: RateChange[],
  overridesByMonth: Map<string, number>
): number {
  const override = overridesByMonth.get(monthKey(month));
  if (override != null) return override;

  let amount = base;
  let bestTime = -Infinity;
  for (const rc of rateChanges) {
    const t = monthStart(rc.effectiveMonth).getTime();
    if (t <= month.getTime() && t >= bestTime) {
      bestTime = t;
      amount = toNum(rc.monthlyAmount);
    }
  }
  return amount;
}

/**
 * Ensure every active month of every subscription has exactly one BizExpense
 * charge at its effective amount (override > rate change > base). Idempotent —
 * safe to call on every page load; corrects amounts when pricing changes.
 * Charges are dated the 1st of their month and deduped by (subscriptionId, date).
 */
export async function generateSubscriptionCharges(): Promise<{ created: number; updated: number }> {
  const subs = await db.subscription.findMany({
    include: { rateChanges: true, overrides: true },
  });
  const today = monthStart(new Date());
  let created = 0;
  let updated = 0;

  for (const sub of subs) {
    const base = toNum(sub.monthlyAmount);
    const overridesByMonth = new Map<string, number>(
      sub.overrides.map((o: Override) => [monthKey(monthStart(o.month)), toNum(o.amount)])
    );

    const start = monthStart(sub.startDate);
    const end = sub.endDate ? monthStart(sub.endDate) : today;

    // Load existing charges for this subscription once, keyed by month.
    const existing = await db.bizExpense.findMany({
      where: { subscriptionId: sub.id },
      select: { id: true, date: true, amount: true },
    });
    const existingByMonth = new Map(existing.map((c) => [monthKey(monthStart(c.date)), c]));

    for (let cursor = start; cursor <= end; cursor = addMonth(cursor)) {
      const date = new Date(cursor);
      const amount = effectiveAmountFor(date, base, sub.rateChanges, overridesByMonth);
      const current = existingByMonth.get(monthKey(date));

      if (!current) {
        await db.bizExpense.create({
          data: {
            date,
            name: sub.name,
            categoryId: sub.categoryId,
            isRecurring: true,
            amount,
            fiscalYear: fiscalYearOf(date),
            subscriptionId: sub.id,
          },
        });
        created++;
      } else if (toNum(current.amount) !== amount) {
        await db.bizExpense.update({ where: { id: current.id }, data: { amount } });
        updated++;
      }
    }
  }
  return { created, updated };
}

/** Effective amount for the current month given base + rate changes (no overrides). */
function currentRate(base: number, rateChanges: RateChange[]): number {
  return effectiveAmountFor(monthStart(new Date()), base, rateChanges, new Map());
}

export interface GetSubscriptionsOptions {
  categoryIds?: string[];
  /** Case-insensitive free-text search over the service name. */
  q?: string;
}

export async function getSubscriptions(opts: GetSubscriptionsOptions = {}) {
  await generateSubscriptionCharges();
  const q = opts.q?.trim();
  const subs = await db.subscription.findMany({
    where: {
      ...(opts.categoryIds?.length && { categoryId: { in: opts.categoryIds } }),
      ...(q && { name: { contains: q, mode: "insensitive" } }),
    },
    orderBy: [{ endDate: "asc" }, { startDate: "desc" }],
    include: {
      category: { select: { name: true } },
      charges: { select: { amount: true } },
      rateChanges: { select: { effectiveMonth: true, monthlyAmount: true } },
    },
  });
  return subs.map((s) => ({
    id: s.id,
    name: s.name,
    categoryId: s.categoryId,
    categoryName: s.category.name,
    monthlyAmount: toNum(s.monthlyAmount),
    currentMonthlyAmount: currentRate(toNum(s.monthlyAmount), s.rateChanges),
    rateChangeCount: s.rateChanges.length,
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
    include: {
      category: { select: { name: true } },
      rateChanges: { orderBy: { effectiveMonth: "asc" } },
      overrides: true,
    },
  });
  if (!sub) return null;

  const overrideMonths = new Set(sub.overrides.map((o) => monthKey(monthStart(o.month))));
  const overrideNotes = new Map(sub.overrides.map((o) => [monthKey(monthStart(o.month)), o.note]));

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
    currentMonthlyAmount: currentRate(toNum(sub.monthlyAmount), sub.rateChanges),
    rateChangeCount: sub.rateChanges.length,
    startDate: toIso(sub.startDate),
    endDate: toIso(sub.endDate),
    isActive: sub.endDate === null,
    notes: sub.notes,
    totalSpent: charges.reduce((sum, c) => sum + toNum(c.amount), 0),
    rateChanges: sub.rateChanges.map((rc) => ({
      id: rc.id,
      effectiveMonth: toIso(rc.effectiveMonth),
      monthlyAmount: toNum(rc.monthlyAmount),
      note: rc.note,
    })),
    charges: charges.map((c) => {
      const key = monthKey(monthStart(c.date));
      return {
        id: c.id,
        date: toIso(c.date),
        amount: toNum(c.amount),
        fiscalYear: c.fiscalYear,
        isOverride: overrideMonths.has(key),
        note: overrideNotes.get(key) ?? null,
      };
    }),
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
      startDate: monthStartFromInput(input.startDate),
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
      ...(input.startDate && { startDate: monthStartFromInput(input.startDate) }),
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
  const end = endDate ? monthStartFromInput(endDate) : monthStart(new Date());
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
  // Charges, rate changes and overrides cascade-delete via their FKs.
  await db.subscription.delete({ where: { id } });
  return { deleted: true };
}

// ─── Pricing: effective-dated rate changes ────────────────────────────────────

export interface RateChangeInput {
  effectiveMonth: string; // yyyy-mm or ISO date
  monthlyAmount: number;
  note?: string | null;
}

/** Add or update the rate change for a month, then re-price the charges. */
export async function addRateChange(subscriptionId: string, input: RateChangeInput) {
  const effectiveMonth = monthStartFromInput(input.effectiveMonth);
  await db.subscriptionRateChange.upsert({
    where: { subscriptionId_effectiveMonth: { subscriptionId, effectiveMonth } },
    update: { monthlyAmount: input.monthlyAmount, note: input.note ?? null },
    create: {
      subscriptionId,
      effectiveMonth,
      monthlyAmount: input.monthlyAmount,
      note: input.note ?? null,
    },
  });
  await generateSubscriptionCharges();
  return { ok: true };
}

export async function deleteRateChange(rcId: string) {
  await db.subscriptionRateChange.delete({ where: { id: rcId } });
  await generateSubscriptionCharges();
  return { deleted: true };
}

// ─── Pricing: per-month overrides (discounts / coupons) ───────────────────────

export interface OverrideInput {
  month: string; // yyyy-mm or ISO date
  amount: number;
  note?: string | null;
}

/** Set (or update) a per-month amount override, then re-price that month. */
export async function setMonthOverride(subscriptionId: string, input: OverrideInput) {
  const month = monthStartFromInput(input.month);
  await db.subscriptionMonthOverride.upsert({
    where: { subscriptionId_month: { subscriptionId, month } },
    update: { amount: input.amount, note: input.note ?? null },
    create: { subscriptionId, month, amount: input.amount, note: input.note ?? null },
  });
  await generateSubscriptionCharges();
  return { ok: true };
}

/** Clear a month override — the month reverts to its scheduled rate. */
export async function clearMonthOverride(subscriptionId: string, month: string) {
  const m = monthStartFromInput(month);
  await db.subscriptionMonthOverride.deleteMany({ where: { subscriptionId, month: m } });
  await generateSubscriptionCharges();
  return { cleared: true };
}
