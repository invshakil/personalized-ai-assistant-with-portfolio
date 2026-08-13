// Public, aggregate-safe trip summary for /trips/<slug>. Returns ONLY what a
// reader needs as a cost guide — destination, dates, per-category + per-day totals
// (BDT and local), budget totals, derived insights, and the author's intro. NEVER
// account names, balances, notes, participant names, per-person spend, or any other
// private ledger field. Non-published / unknown slug → null (→ 404).
import { db } from "@/lib/db";
import { getFxRateToBdt } from "@/services/_shared/fx";
import { TRIP_CATEGORIES, TRIP_CATEGORY_LABEL } from "@/types";
import type {
  PublicTripCategory,
  PublicTripDay,
  PublicTripInsights,
  PublicTripSummary,
} from "@/types";
import { toNum, toIso, money2 } from "./_serializers";

const DAY_MS = 86_400_000;

/** Hard ceiling on the zero-filled daily series. A trip spanning more than this
 *  (or holding a stray out-of-range expense date) falls back to spend days only. */
const MAX_CHART_DAYS = 366;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

/** Inclusive yyyy-mm-dd range, walked in UTC to match `dayKey`. Returns [] when the
 *  span is unparsable, inverted, or longer than `max` — the length is checked
 *  before the array is built, so a stray far-future expense date costs nothing. */
function eachDay(from: string, to: string, max: number): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
  if (Math.round((end - start) / DAY_MS) + 1 > max) return [];
  const days: string[] = [];
  for (let t = start; t <= end; t += DAY_MS) days.push(new Date(t).toISOString().slice(0, 10));
  return days;
}

export async function getPublicTripSummary(slug: string): Promise<PublicTripSummary | null> {
  const trip = await db.trip.findFirst({ where: { publicSlug: slug, isPublic: true } });
  if (!trip) return null;

  // Aggregate the group cost from the split ledger (all payers), already in BDT.
  // Aggregate-safe only: no participant names, per-person spend, or account fields.
  const [expenses, budgets] = await Promise.all([
    db.tripExpense.findMany({
      where: { tripId: trip.id },
      select: { amountBdt: true, amount: true, currency: true, category: true, date: true },
    }),
    db.tripBudget.findMany({
      where: { tripId: trip.id },
      select: { category: true, plannedAmount: true },
    }),
  ]);

  // A bucket carries BDT (canonical) plus the local-currency amount that was
  // genuinely paid on the ground, kept apart from spend in other currencies so we
  // only ever apply a live rate to the part we have no local figure for.
  interface Bucket {
    bdt: number;
    localPaid: number; // summed from expenses already in localCurrency
    bdtToConvert: number; // BDT of expenses in some other currency
  }
  const bucket = (): Bucket => ({ bdt: 0, localPaid: 0, bdtToConvert: 0 });
  const add = (map: Map<string, Bucket>, key: string, bdt: number, local: number | null) => {
    const b = map.get(key) ?? bucket();
    b.bdt += bdt;
    if (local != null) b.localPaid += local;
    else b.bdtToConvert += bdt;
    map.set(key, b);
  };

  const byCatMap = new Map<string, Bucket>();
  const byDayMap = new Map<string, Bucket>();
  const totals = bucket();
  for (const e of expenses) {
    const bdt = toNum(e.amountBdt);
    // Spend booked in the destination currency is reported exactly as paid; only
    // spend in another currency gets valued at the live rate.
    const local = e.currency === trip.localCurrency ? toNum(e.amount) : null;
    totals.bdt += bdt;
    if (local != null) totals.localPaid += local;
    else totals.bdtToConvert += bdt;
    add(byCatMap, e.category, bdt, local);
    add(byDayMap, dayKey(e.date), bdt, local);
  }

  // Live rate (BDT-per-1-local → divide) — only used for the non-local remainder.
  const live = await getFxRateToBdt(trip.localCurrency);
  const convert = (bdt: number) => (live.rate > 0 ? bdt / live.rate : 0);
  const localOf = (b: Bucket) => money2(b.localPaid + convert(b.bdtToConvert));

  const total = money2(totals.bdt);
  const totalLocal = localOf(totals);
  const share = (bdt: number) => (total > 0 ? money2((bdt / total) * 100) : 0);

  const plannedMap = new Map(budgets.map((b) => [b.category, toNum(b.plannedAmount)]));
  const byCategory: PublicTripCategory[] = TRIP_CATEGORIES.map((category) => {
    const b = byCatMap.get(category) ?? bucket();
    const bdt = money2(b.bdt);
    const planned = plannedMap.get(category);
    return {
      category,
      label: TRIP_CATEGORY_LABEL[category],
      bdt,
      local: localOf(b),
      share: share(bdt),
      plannedBdt: planned != null ? money2(planned) : null,
    };
  })
    .filter((c) => c.bdt > 0)
    .sort((a, b) => b.bdt - a.bdt);

  // Daily series: zero-filled across the trip window so quiet days read as quiet
  // rather than being collapsed out of the chart.
  const spendDays = Array.from(byDayMap.keys()).sort();
  const rangeStart = [dayKey(trip.startDate), ...spendDays].sort()[0];
  const rangeEnd = [dayKey(trip.endDate ?? trip.startDate), ...spendDays].sort().slice(-1)[0];
  const filled = eachDay(rangeStart, rangeEnd, MAX_CHART_DAYS);
  const chartDays = filled.length > 0 ? filled : spendDays;

  const byDay: PublicTripDay[] = chartDays.map((date) => {
    const b = byDayMap.get(date) ?? bucket();
    return { date, bdt: money2(b.bdt), local: localOf(b) };
  });

  const durationDays = trip.endDate
    ? Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / DAY_MS) + 1
    : null;

  const spent = byDay.filter((d) => d.bdt > 0);
  const totalPlanned = budgets.reduce((sum, b) => sum + toNum(b.plannedAmount), 0);

  const insights: PublicTripInsights = {
    expenseCount: expenses.length,
    activeDays: spent.length,
    avgPerDayBdt: durationDays ? money2(total / durationDays) : null,
    avgPerActiveDayBdt: spent.length ? money2(total / spent.length) : null,
    busiestDay: spent.reduce<PublicTripDay | null>(
      (max, d) => (max == null || d.bdt > max.bdt ? d : max),
      null
    ),
    quietestDay: spent.reduce<PublicTripDay | null>(
      (min, d) => (min == null || d.bdt < min.bdt ? d : min),
      null
    ),
    topCategory: byCategory[0] ?? null,
    // The rate the trip actually settled at (blended across every expense), not
    // today's quote — that is the number a reader can plan against.
    fxRate: totalLocal > 0 ? money2(total / totalLocal) : live.rate,
    totalPlannedBdt: budgets.length ? money2(totalPlanned) : null,
  };

  return {
    name: trip.name,
    destination: trip.destination,
    localCurrency: trip.localCurrency,
    homeCurrency: trip.homeCurrency,
    startDate: toIso(trip.startDate)!,
    endDate: toIso(trip.endDate),
    durationDays,
    publicIntro: trip.publicIntro,
    totalBdt: total,
    totalLocal,
    byCategory,
    byDay,
    insights,
  };
}
