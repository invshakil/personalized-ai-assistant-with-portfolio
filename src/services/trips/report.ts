// Trip report — planned vs actual by category, the settlement split (immediate
// cash/bank vs deferred credit card), currency + per-day breakdowns, and the
// foreign wallet summary. Actuals are valued in BDT via each row's STORED rate
// (historical accuracy); the wallet's leftover is valued at the LIVE rate.
import { db } from "@/lib/db";
import { getAccountBalance } from "@/services/money/accounts";
import { getFxRateToBdt, getLatestRatesToBdt } from "@/services/_shared/fx";
import { TRIP_CATEGORIES } from "@/types";
import type {
  TripCategoryReport,
  TripCurrencyBreakdown,
  TripDaySpend,
  TripReport,
  TripSettlementSplit,
  TripWalletSummary,
} from "@/types";
import { toNum, rowRate, money2 } from "./_serializers";
import { getTrip } from "./trips";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

async function computeWallet(
  tripId: string,
  accountId: string,
  accountName: string | null,
  currency: string
): Promise<TripWalletSummary> {
  // Fundings = cross-currency TRANSFERs into the wallet for this trip.
  const fundings = await db.moneyEntry.findMany({
    where: { tripId, direction: "TRANSFER", transferAccountId: accountId },
    select: { amount: true, toAmount: true, currency: true },
  });
  const sourceCurrencies = Array.from(new Set(fundings.map((f) => f.currency)));
  const rates = await getLatestRatesToBdt(sourceCurrencies);

  let fundedLocal = 0;
  let fundedBdt = 0;
  for (const f of fundings) {
    fundedLocal += toNum(f.toAmount);
    const amt = toNum(f.amount);
    fundedBdt += f.currency === "BDT" ? amt : amt * (rates.get(f.currency)?.rate ?? 0);
  }

  const spent = await db.moneyEntry.aggregate({
    where: { tripId, direction: "DEBIT", accountId },
    _sum: { amount: true },
  });
  const spentLocal = toNum(spent._sum.amount);

  const balanceLocal = await getAccountBalance(accountId);
  const live = await getFxRateToBdt(currency);
  const balanceBdt = live.rate > 0 ? money2(balanceLocal * live.rate) : null;

  return {
    accountId,
    accountName: accountName ?? accountId,
    currency,
    fundedLocal: money2(fundedLocal),
    fundedBdt: money2(fundedBdt),
    spentLocal: money2(spentLocal),
    balanceLocal: money2(balanceLocal),
    balanceBdt,
  };
}

export async function getTripReport(tripId: string): Promise<TripReport | null> {
  const trip = await getTrip(tripId);
  if (!trip) return null;

  const debits = await db.moneyEntry.findMany({
    where: { tripId, direction: "DEBIT" },
    select: {
      amount: true,
      fxRate: true,
      currency: true,
      tripCategory: true,
      date: true,
      account: { select: { type: true } },
    },
  });

  const plannedByCat = new Map<string, number>();
  for (const b of trip.budgets) plannedByCat.set(b.category, b.plannedAmount);

  const actualByCat = new Map<string, number>();
  const byCurrencyMap = new Map<string, { original: number; bdt: number }>();
  const byDayMap = new Map<string, number>();
  let outOfPocketBdt = 0;
  let creditCardBdt = 0;

  for (const e of debits) {
    const bdt = toNum(e.amount) * rowRate(e.fxRate);
    const cat = e.tripCategory ?? "MISC";
    actualByCat.set(cat, (actualByCat.get(cat) ?? 0) + bdt);

    const cur = byCurrencyMap.get(e.currency) ?? { original: 0, bdt: 0 };
    cur.original += toNum(e.amount);
    cur.bdt += bdt;
    byCurrencyMap.set(e.currency, cur);

    byDayMap.set(dayKey(e.date), (byDayMap.get(dayKey(e.date)) ?? 0) + bdt);

    if (e.account?.type === "CREDIT_CARD") creditCardBdt += bdt;
    else outOfPocketBdt += bdt;
  }

  const byCategory: TripCategoryReport[] = TRIP_CATEGORIES.map((category) => ({
    category,
    plannedBdt: money2(plannedByCat.get(category) ?? 0),
    actualBdt: money2(actualByCat.get(category) ?? 0),
  }));

  const byCurrency: TripCurrencyBreakdown[] = Array.from(byCurrencyMap.entries())
    .map(([currency, v]) => ({ currency, originalAmount: money2(v.original), bdt: money2(v.bdt) }))
    .sort((a, b) => b.bdt - a.bdt);

  const byDay: TripDaySpend[] = Array.from(byDayMap.entries())
    .map(([date, bdt]) => ({ date, bdt: money2(bdt) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const settlement: TripSettlementSplit = {
    outOfPocketBdt: money2(outOfPocketBdt),
    creditCardBdt: money2(creditCardBdt),
  };

  const wallet = trip.localWalletAccountId
    ? await computeWallet(
        tripId,
        trip.localWalletAccountId,
        trip.localWalletAccountName,
        trip.localCurrency
      )
    : null;

  return {
    trip,
    byCategory,
    settlement,
    byCurrency,
    byDay,
    wallet,
    totalPlannedBdt: trip.totalPlannedBdt,
    totalActualBdt: money2(outOfPocketBdt + creditCardBdt),
  };
}
