// Public, aggregate-safe trip summary for /trips/<slug>. Returns ONLY what a
// reader needs as a cost guide — destination, dates, per-category + per-day totals
// (BDT and local), and the author's intro. NEVER account names, balances, notes,
// or other private ledger fields. Non-published / unknown slug → null (→ 404).
import { db } from "@/lib/db";
import { getFxRateToBdt } from "@/services/_shared/fx";
import { TRIP_CATEGORIES, TRIP_CATEGORY_LABEL } from "@/types";
import type { PublicTripCategory, PublicTripSummary, TripDaySpend } from "@/types";
import { toNum, toIso, rowRate, money2 } from "./_serializers";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export async function getPublicTripSummary(slug: string): Promise<PublicTripSummary | null> {
  const trip = await db.trip.findFirst({ where: { publicSlug: slug, isPublic: true } });
  if (!trip) return null;

  const debits = await db.moneyEntry.findMany({
    where: { tripId: trip.id, direction: "DEBIT" },
    select: { amount: true, fxRate: true, tripCategory: true, date: true },
  });

  const byCatMap = new Map<string, number>();
  const byDayMap = new Map<string, number>();
  let totalBdt = 0;
  for (const e of debits) {
    const bdt = toNum(e.amount) * rowRate(e.fxRate);
    totalBdt += bdt;
    const cat = e.tripCategory ?? "MISC";
    byCatMap.set(cat, (byCatMap.get(cat) ?? 0) + bdt);
    byDayMap.set(dayKey(e.date), (byDayMap.get(dayKey(e.date)) ?? 0) + bdt);
  }

  // Value BDT into the local currency at the live rate (BDT-per-1-local → divide).
  const live = await getFxRateToBdt(trip.localCurrency);
  const toLocal = (bdt: number) => (live.rate > 0 ? money2(bdt / live.rate) : 0);

  const byCategory: PublicTripCategory[] = TRIP_CATEGORIES.map((category) => {
    const bdt = money2(byCatMap.get(category) ?? 0);
    return { category, label: TRIP_CATEGORY_LABEL[category], bdt, local: toLocal(bdt) };
  }).filter((c) => c.bdt > 0);

  const byDay: TripDaySpend[] = Array.from(byDayMap.entries())
    .map(([date, bdt]) => ({ date, bdt: money2(bdt) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const durationDays = trip.endDate
    ? Math.round((trip.endDate.getTime() - trip.startDate.getTime()) / 86_400_000) + 1
    : null;

  const total = money2(totalBdt);
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
    totalLocal: toLocal(total),
    byCategory,
    byDay,
  };
}
