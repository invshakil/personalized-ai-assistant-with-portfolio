// Trip Expense Manager scenario coverage. Integration tests against the dev DB.
// All data is created under a unique TAG and removed in after(), so the suite is
// self-cleaning and never touches real rows.
//
// Run: node --import tsx --test src/services/trips/__tests__/trips.scenarios.test.ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createAccount, getAccountBalance } from "@/services/money";
import {
  createTrip,
  getTrip,
  setTripBudget,
  createTripExpense,
  updateTripExpense,
  deleteTripExpense,
  fundTripWallet,
  getTripReport,
  publishTrip,
  unpublishTrip,
  getPublicTripSummary,
} from "@/services/trips";
import { db } from "@/lib/db";

const TAG = `__TRIPTEST_${Date.now()}`;

let cashId = "";
let cardId = "";
let walletId = "";
let tripId = "";
let slug = "";

before(async () => {
  const cash = await createAccount({ name: `${TAG} Cash`, type: "CASH", openingBalance: 100000 });
  const card = await createAccount({ name: `${TAG} Card`, type: "CREDIT_CARD", openingBalance: 0 });
  const wallet = await createAccount({
    name: `${TAG} MYR Wallet`,
    type: "CASH",
    currency: "MYR",
    openingBalance: 0,
  });
  cashId = cash.id;
  cardId = card.id;
  walletId = wallet.id;

  const trip = await createTrip({
    name: `${TAG} Malaysia`,
    destination: "Kuala Lumpur",
    localCurrency: "MYR",
    startDate: "2026-08-01",
    endDate: "2026-08-05",
    localWalletAccountId: walletId,
  });
  tripId = trip.id;
});

test("budgets roll up to totalPlannedBdt", async () => {
  await setTripBudget(tripId, "FLIGHTS", 6000);
  await setTripBudget(tripId, "FOOD", 10000);
  await setTripBudget(tripId, "ACCOMMODATION", 9000);
  const trip = await getTrip(tripId);
  assert.equal(trip?.totalPlannedBdt, 25000);
});

test("expenses on cash / card / MYR wallet split correctly", async () => {
  // Cash (out-of-pocket, BDT)
  await createTripExpense({
    tripId,
    tripCategory: "FLIGHTS",
    accountId: cashId,
    amount: 5000,
    date: "2026-08-01",
  });
  // Credit card (deferred, BDT)
  await createTripExpense({
    tripId,
    tripCategory: "ACCOMMODATION",
    accountId: cardId,
    amount: 8000,
    date: "2026-08-02",
  });
  // Fund the MYR wallet: 30,000 BDT → 1,000 MYR
  await fundTripWallet({
    tripId,
    fromAccountId: cashId,
    toAccountId: walletId,
    amount: 30000,
    toAmount: 1000,
    date: "2026-08-01",
  });
  // Spend MYR from the wallet: 200 MYR @ 30 = 6,000 BDT
  await createTripExpense({
    tripId,
    tripCategory: "FOOD",
    accountId: walletId,
    amount: 200,
    date: "2026-08-03",
    fxRate: 30,
  });

  const report = await getTripReport(tripId);
  assert.ok(report, "report exists");

  // Settlement: cash 5000 + MYR-wallet 6000 = 11000 out-of-pocket; card 8000 deferred.
  assert.equal(report!.settlement.outOfPocketBdt, 11000);
  assert.equal(report!.settlement.creditCardBdt, 8000);
  assert.equal(report!.totalActualBdt, 19000);

  // By category actuals.
  const byCat = Object.fromEntries(report!.byCategory.map((c) => [c.category, c.actualBdt]));
  assert.equal(byCat.FLIGHTS, 5000);
  assert.equal(byCat.ACCOMMODATION, 8000);
  assert.equal(byCat.FOOD, 6000);

  // By currency: BDT 13000, MYR original 200 → 6000 BDT.
  const myr = report!.byCurrency.find((c) => c.currency === "MYR");
  assert.equal(myr?.originalAmount, 200);
  assert.equal(myr?.bdt, 6000);

  // Wallet: funded 1000, spent 200, leftover 800 MYR.
  assert.equal(report!.wallet?.fundedLocal, 1000);
  assert.equal(report!.wallet?.fundedBdt, 30000);
  assert.equal(report!.wallet?.spentLocal, 200);
  assert.equal(report!.wallet?.balanceLocal, 800);
  assert.equal(await getAccountBalance(walletId), 800);
});

test("credit-card spend does not reduce the cash balance beyond cash spend + funding", async () => {
  // Cash started at 100000; spent 5000 (flight) + 30000 (funding) = 35000 out.
  const cashBalance = await getAccountBalance(cashId);
  assert.equal(cashBalance, 65000);
  // Card balance is negative by the deferred amount (debt), untouched by cash.
  const cardBalance = await getAccountBalance(cardId);
  assert.equal(cardBalance, -8000);
});

test("publish exposes an aggregate-safe summary; unpublish hides it", async () => {
  const published = await publishTrip(tripId);
  slug = published.publicSlug ?? "";
  assert.ok(slug, "slug minted");

  const summary = await getPublicTripSummary(slug);
  assert.ok(summary, "public summary available while published");
  assert.equal(summary!.totalBdt, 19000);
  assert.equal(summary!.byCategory.length, 3);
  // Aggregate-safe: no account fields leak.
  assert.equal(Object.prototype.hasOwnProperty.call(summary!, "accountName"), false);

  await unpublishTrip(tripId);
  const gone = await getPublicTripSummary(slug);
  assert.equal(gone, null, "unpublished trip is not publicly reachable");
});

test("non-finite amounts are rejected (guard hardening)", async () => {
  await assert.rejects(
    () =>
      createTripExpense({
        tripId,
        tripCategory: "FOOD",
        accountId: cashId,
        amount: NaN,
        date: "2026-08-01",
      }),
    /finite/
  );
  await assert.rejects(
    () =>
      createTripExpense({
        tripId,
        tripCategory: "FOOD",
        accountId: cashId,
        amount: Infinity,
        date: "2026-08-01",
      }),
    /finite/
  );
  await assert.rejects(() => setTripBudget(tripId, "FOOD", NaN), /finite/);
});

test("expense mutations are scoped to their trip", async () => {
  const exp = await createTripExpense({
    tripId,
    tripCategory: "MISC",
    accountId: cashId,
    amount: 100,
    date: "2026-08-04",
  });
  await assert.rejects(
    () => deleteTripExpense("some-other-trip", exp.id),
    /not found for this trip/
  );
  await assert.rejects(
    () => updateTripExpense("some-other-trip", exp.id, { amount: 50 }),
    /not found for this trip/
  );
  const updated = await updateTripExpense(tripId, exp.id, { amount: 150 });
  assert.equal(updated.amount, 150);
  await deleteTripExpense(tripId, exp.id);
});

test("trip currency + wallet coherence is enforced", async () => {
  // cashId is a BDT account — cannot be an MYR trip's wallet.
  await assert.rejects(
    () =>
      createTrip({
        name: `${TAG} Bad1`,
        destination: "X",
        localCurrency: "MYR",
        startDate: "2026-08-01",
        localWalletAccountId: cashId,
      }),
    /must match/
  );
  await assert.rejects(
    () =>
      createTrip({
        name: `${TAG} Bad2`,
        destination: "X",
        localCurrency: "HELLO",
        startDate: "2026-08-01",
      }),
    /currency code/
  );
});

after(async () => {
  const trips = await db.trip.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  const accts = await db.moneyAccount.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  const tripIds = trips.map((t) => t.id);
  const acctIds = accts.map((a) => a.id);
  await db.moneyEntry.deleteMany({
    where: {
      OR: [
        { tripId: { in: tripIds } },
        { accountId: { in: acctIds } },
        { transferAccountId: { in: acctIds } },
      ],
    },
  });
  await db.tripBudget.deleteMany({ where: { tripId: { in: tripIds } } });
  await db.trip.deleteMany({ where: { id: { in: tripIds } } });
  await db.moneyAccount.deleteMany({ where: { id: { in: acctIds } } });
  await db.$disconnect();
});
