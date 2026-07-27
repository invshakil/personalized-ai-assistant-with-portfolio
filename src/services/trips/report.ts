// Trip report — planned vs actual by category, Syful's personal cash-flow split
// (immediate cash/bank/wallet vs deferred credit card), currency + per-day
// breakdowns, the foreign wallet summary, and the group view: per-person
// paid/spent/net plus the minimal set of settle-up transfers (who owes whom).
//
// Group cost aggregates TripExpense (all payers, each already canonicalized to BDT
// via its stored fxRate). The wallet leftover is valued at the LIVE rate.
import { db } from "@/lib/db";
import { getAccountBalance } from "@/services/money/accounts";
import { getFxRateToBdt, getLatestRatesToBdt } from "@/services/_shared/fx";
import { TRIP_CATEGORIES } from "@/types";
import type {
  TripCategoryReport,
  TripCurrencyBreakdown,
  TripDaySpend,
  TripOwesTransfer,
  TripPersonBalance,
  TripReport,
  TripSettlementSplit,
  TripWalletSummary,
} from "@/types";
import { toNum, money2 } from "./_serializers";
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

  // Local spent from the wallet = self-paid trip expenses whose funding account is the wallet.
  const spent = await db.tripExpense.aggregate({
    where: { tripId, accountId },
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

/** Greedy minimal settle-up: match the largest debtor to the largest creditor. */
function minimalTransfers(
  balances: { participantId: string; name: string; netBdt: number }[]
): TripOwesTransfer[] {
  const creditors = balances
    .filter((b) => b.netBdt > 0)
    .map((b) => ({ id: b.participantId, name: b.name, cents: Math.round(b.netBdt * 100) }))
    .sort((a, b) => b.cents - a.cents);
  const debtors = balances
    .filter((b) => b.netBdt < 0)
    .map((b) => ({ id: b.participantId, name: b.name, cents: Math.round(-b.netBdt * 100) }))
    .sort((a, b) => b.cents - a.cents);

  const out: TripOwesTransfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].cents, creditors[j].cents);
    if (pay > 0) {
      out.push({
        fromParticipantId: debtors[i].id,
        fromName: debtors[i].name,
        toParticipantId: creditors[j].id,
        toName: creditors[j].name,
        amountBdt: money2(pay / 100),
      });
    }
    debtors[i].cents -= pay;
    creditors[j].cents -= pay;
    if (debtors[i].cents === 0) i++;
    if (creditors[j].cents === 0) j++;
  }
  return out;
}

export async function getTripReport(tripId: string): Promise<TripReport | null> {
  const trip = await getTrip(tripId);
  if (!trip) return null;

  const [expenses, participants, settlements] = await Promise.all([
    db.tripExpense.findMany({
      where: { tripId },
      select: {
        amount: true,
        amountBdt: true,
        currency: true,
        category: true,
        date: true,
        payerId: true,
        payer: { select: { isSelf: true } },
        account: { select: { type: true } },
        shares: { select: { participantId: true, amountBdt: true } },
      },
    }),
    db.tripParticipant.findMany({
      where: { tripId },
      select: { id: true, name: true, isSelf: true },
      orderBy: [{ isSelf: "desc" }, { name: "asc" }],
    }),
    db.tripSettlement.findMany({
      where: { tripId },
      select: { fromParticipantId: true, toParticipantId: true, amountBdt: true },
    }),
  ]);

  const plannedByCat = new Map<string, number>();
  for (const b of trip.budgets) plannedByCat.set(b.category, b.plannedAmount);

  const actualByCat = new Map<string, number>();
  const byCurrencyMap = new Map<string, { original: number; bdt: number }>();
  const byDayMap = new Map<string, number>();
  const paidByP = new Map<string, number>();
  const spentByP = new Map<string, number>();
  let outOfPocketBdt = 0;
  let creditCardBdt = 0;
  let groupTotalBdt = 0;
  let paidByMeBdt = 0;

  for (const e of expenses) {
    const bdt = toNum(e.amountBdt);
    groupTotalBdt += bdt;
    actualByCat.set(e.category, (actualByCat.get(e.category) ?? 0) + bdt);

    const cur = byCurrencyMap.get(e.currency) ?? { original: 0, bdt: 0 };
    cur.original += toNum(e.amount);
    cur.bdt += bdt;
    byCurrencyMap.set(e.currency, cur);

    byDayMap.set(dayKey(e.date), (byDayMap.get(dayKey(e.date)) ?? 0) + bdt);

    paidByP.set(e.payerId, (paidByP.get(e.payerId) ?? 0) + bdt);
    for (const sh of e.shares) {
      spentByP.set(sh.participantId, (spentByP.get(sh.participantId) ?? 0) + toNum(sh.amountBdt));
    }

    // Personal cash-flow split — only what Syful himself fronted.
    if (e.payer.isSelf) {
      paidByMeBdt += bdt;
      if (e.account?.type === "CREDIT_CARD") creditCardBdt += bdt;
      else outOfPocketBdt += bdt;
    }
  }

  const settledOut = new Map<string, number>();
  const settledIn = new Map<string, number>();
  for (const s of settlements) {
    const bdt = toNum(s.amountBdt);
    settledOut.set(s.fromParticipantId, (settledOut.get(s.fromParticipantId) ?? 0) + bdt);
    settledIn.set(s.toParticipantId, (settledIn.get(s.toParticipantId) ?? 0) + bdt);
  }

  const balances: TripPersonBalance[] = participants.map((p) => {
    const paidBdt = money2(paidByP.get(p.id) ?? 0);
    const spentBdt = money2(spentByP.get(p.id) ?? 0);
    const settlementsPaidBdt = money2(settledOut.get(p.id) ?? 0);
    const settlementsReceivedBdt = money2(settledIn.get(p.id) ?? 0);
    const netBdt = money2(paidBdt + settlementsPaidBdt - spentBdt - settlementsReceivedBdt);
    return {
      participantId: p.id,
      name: p.name,
      isSelf: p.isSelf,
      paidBdt,
      spentBdt,
      settlementsPaidBdt,
      settlementsReceivedBdt,
      netBdt,
    };
  });

  const owes = minimalTransfers(
    balances.map((b) => ({ participantId: b.participantId, name: b.name, netBdt: b.netBdt }))
  );

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

  const personalCashFlow: TripSettlementSplit = {
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
    personalCashFlow,
    byCurrency,
    byDay,
    wallet,
    participants: balances,
    owes,
    totalPlannedBdt: trip.totalPlannedBdt,
    totalActualBdt: money2(groupTotalBdt),
    paidByMeBdt: money2(paidByMeBdt),
  };
}
