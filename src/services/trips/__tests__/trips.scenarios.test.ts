// Trip Expense Manager v2 scenario coverage — group trips: participants, splitting,
// the posting rule (self+real-account posts; card & friend-paid don't), settlements,
// and who-owes-whom. Integration tests against the dev DB. All data is created under
// a unique TAG and removed in after(), so the suite is self-cleaning.
//
// Run: node --import tsx --test src/services/trips/__tests__/trips.scenarios.test.ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createAccount, getAccountBalance } from "@/services/money";
import {
  createTrip,
  getTrip,
  listParticipants,
  createParticipant,
  deleteParticipant,
  setTripBudget,
  createTripExpense,
  updateTripExpense,
  deleteTripExpense,
  fundTripWallet,
  createSettlement,
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
let selfId = "";
let bobId = "";
let carolId = "";
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

  // createTrip auto-creates the self ("Me") participant.
  const ps = await listParticipants(tripId);
  selfId = ps.find((p) => p.isSelf)!.id;
  bobId = (await createParticipant({ tripId, name: `${TAG} Bob` })).id;
  carolId = (await createParticipant({ tripId, name: `${TAG} Carol` })).id;
});

test("createTrip seeds exactly one self participant", async () => {
  const ps = await listParticipants(tripId);
  assert.equal(ps.filter((p) => p.isSelf).length, 1);
  assert.equal(ps.length, 3);
  await assert.rejects(
    () => createParticipant({ tripId, name: `${TAG} Fake`, isSelf: true }),
    /already has a 'self'/
  );
});

test("budgets roll up to totalPlannedBdt", async () => {
  await setTripBudget(tripId, "FLIGHTS", 6000);
  await setTripBudget(tripId, "FOOD", 10000);
  const trip = await getTrip(tripId);
  assert.equal(trip?.totalPlannedBdt, 16000);
});

test("cash self-paid posts a MoneyEntry, reduces cash, and splits with exact cents", async () => {
  const exp = await createTripExpense({
    tripId,
    category: "FLIGHTS",
    date: "2026-08-01",
    payerId: selfId,
    accountId: cashId,
    amount: 3001, // /3 → 1000.34, 1000.33, 1000.33
    shares: [{ participantId: selfId }, { participantId: bobId }, { participantId: carolId }],
  });
  assert.equal(exp.posted, true);
  assert.equal(exp.shares.length, 3);
  const shareSum = Math.round(exp.shares.reduce((s, x) => s + x.amount, 0) * 100) / 100;
  assert.equal(shareSum, 3001);
  assert.equal(await getAccountBalance(cashId), 96999); // 100000 − 3001
});

test("credit-card self-paid does NOT post; card balance unchanged; counts as deferred", async () => {
  const exp = await createTripExpense({
    tripId,
    category: "ACCOMMODATION",
    date: "2026-08-02",
    payerId: selfId,
    accountId: cardId,
    amount: 8000,
    shares: [{ participantId: selfId }, { participantId: bobId }, { participantId: carolId }],
  });
  assert.equal(exp.posted, false, "card expense must not post to the money ledger");
  assert.equal(await getAccountBalance(cardId), 0, "card balance untouched by trip card spend");
  const report = await getTripReport(tripId);
  assert.equal(report!.personalCashFlow.creditCardBdt, 8000);
});

test("friend-paid expense creates no MoneyEntry and touches no account", async () => {
  const before = await getAccountBalance(cashId);
  const exp = await createTripExpense({
    tripId,
    category: "FOOD",
    date: "2026-08-02",
    payerId: bobId,
    amount: 1200,
    shares: [{ participantId: selfId }, { participantId: bobId }, { participantId: carolId }],
  });
  assert.equal(exp.posted, false);
  assert.equal(exp.accountId, null);
  assert.equal(exp.payerIsSelf, false);
  assert.equal(await getAccountBalance(cashId), before);
});

test("MYR wallet funding + wallet spend posts and reduces the wallet", async () => {
  await fundTripWallet({
    tripId,
    fromAccountId: cashId,
    toAccountId: walletId,
    amount: 30000,
    toAmount: 1000,
    date: "2026-08-01",
  });
  const exp = await createTripExpense({
    tripId,
    category: "FOOD",
    date: "2026-08-03",
    payerId: selfId,
    accountId: walletId,
    amount: 200,
    fxRate: 30,
    shares: [{ participantId: selfId }, { participantId: bobId }],
  });
  assert.equal(exp.posted, true);
  assert.equal(exp.currency, "MYR");
  assert.equal(exp.amountBdt, 6000); // 200 × 30
  assert.equal(await getAccountBalance(walletId), 800); // 1000 funded − 200 spent
  assert.equal(await getAccountBalance(cashId), 66999); // 96999 − 30000 funding
});

test("EXACT split must sum to the amount", async () => {
  await assert.rejects(
    () =>
      createTripExpense({
        tripId,
        category: "MISC",
        date: "2026-08-03",
        payerId: selfId,
        accountId: cashId,
        amount: 200,
        splitMode: "EXACT",
        shares: [
          { participantId: selfId, amount: 100 },
          { participantId: bobId, amount: 50 },
        ],
      }),
    /must sum/
  );
  const ok = await createTripExpense({
    tripId,
    category: "MISC",
    date: "2026-08-03",
    payerId: selfId,
    accountId: cashId,
    amount: 200,
    splitMode: "EXACT",
    shares: [
      { participantId: selfId, amount: 120 },
      { participantId: bobId, amount: 80 },
    ],
  });
  assert.equal(ok.shares.find((s) => s.participantId === bobId)?.amount, 80);
});

test("non-finite amounts are rejected", async () => {
  await assert.rejects(
    () =>
      createTripExpense({
        tripId,
        category: "FOOD",
        date: "2026-08-01",
        payerId: selfId,
        accountId: cashId,
        amount: Number.NaN,
        shares: [{ participantId: selfId }],
      }),
    /finite/
  );
  await assert.rejects(() => setTripBudget(tripId, "FOOD", Number.POSITIVE_INFINITY), /finite/);
});

test("expense mutations are scoped to their trip", async () => {
  const exp = await createTripExpense({
    tripId,
    category: "MISC",
    date: "2026-08-04",
    payerId: selfId,
    accountId: cashId,
    amount: 100,
    shares: [{ participantId: selfId }],
  });
  const full = {
    category: "MISC" as const,
    date: "2026-08-04",
    payerId: selfId,
    accountId: cashId,
    amount: 100,
    shares: [{ participantId: selfId }],
  };
  await assert.rejects(
    () => updateTripExpense("some-other-trip", exp.id, full),
    /not found for this trip/
  );
  await assert.rejects(
    () => deleteTripExpense("some-other-trip", exp.id),
    /not found for this trip/
  );
  await deleteTripExpense(tripId, exp.id);
});

test("settlements drive net balances and a self-consistent who-owes-whom", async () => {
  // Bob hands Syful 1000 BDT toward the trip.
  await createSettlement({
    tripId,
    date: "2026-08-05",
    fromParticipantId: bobId,
    toParticipantId: selfId,
    amount: 1000,
  });
  const report = await getTripReport(tripId);
  const nets = report!.participants.map((p) => p.netBdt);
  const totalNet = Math.round(nets.reduce((a, b) => a + b, 0) * 100) / 100;
  assert.equal(totalNet, 0, "everyone's net must sum to zero");

  // Applying the suggested transfers must zero every balance.
  const net = new Map(report!.participants.map((p) => [p.participantId, p.netBdt]));
  for (const t of report!.owes) {
    net.set(t.fromParticipantId, (net.get(t.fromParticipantId) ?? 0) + t.amountBdt);
    net.set(t.toParticipantId, (net.get(t.toParticipantId) ?? 0) - t.amountBdt);
  }
  for (const [, v] of net)
    assert.ok(Math.abs(v) < 0.01, "settle-up transfers must clear all debts");
});

test("dedicated clean trip: exact who-owes-whom split three ways", async () => {
  const t = await createTrip({
    name: `${TAG} Dinner`,
    destination: "KL",
    localCurrency: "BDT",
    startDate: "2026-08-10",
  });
  const ps = await listParticipants(t.id);
  const me = ps.find((p) => p.isSelf)!.id;
  const b = (await createParticipant({ tripId: t.id, name: `${TAG} B` })).id;
  const c = (await createParticipant({ tripId: t.id, name: `${TAG} C` })).id;
  await createTripExpense({
    tripId: t.id,
    category: "FOOD",
    date: "2026-08-10",
    payerId: me,
    accountId: cashId,
    amount: 300,
    shares: [{ participantId: me }, { participantId: b }, { participantId: c }],
  });
  const report = await getTripReport(t.id);
  const byId = new Map(report!.participants.map((p) => [p.participantId, p]));
  assert.equal(byId.get(me)!.netBdt, 200); // paid 300, ate 100
  assert.equal(byId.get(b)!.netBdt, -100);
  assert.equal(byId.get(c)!.netBdt, -100);
  // Two debtors → one creditor: each owes 100 to me.
  assert.equal(report!.owes.length, 2);
  assert.ok(report!.owes.every((o) => o.toParticipantId === me && o.amountBdt === 100));
});

test("publish exposes an aggregate-safe summary; no participant/debt leak", async () => {
  const published = await publishTrip(tripId);
  slug = published.publicSlug ?? "";
  assert.ok(slug, "slug minted");

  const summary = await getPublicTripSummary(slug);
  assert.ok(summary, "public summary available while published");
  // Group total = cash 3001 + card 8000 + friend 1200 + MYR 6000 + exact 200 = 18401.
  assert.equal(summary!.totalBdt, 18401);
  // No participant names, per-person spend, or who-owes-whom fields leak.
  const keys = Object.keys(summary!);
  assert.ok(!keys.includes("participants"));
  assert.ok(!keys.includes("owes"));
  const json = JSON.stringify(summary);
  assert.equal(json.includes("Bob"), false, "no participant names leak");
  assert.equal(json.includes("Carol"), false, "no participant names leak");
  assert.equal(json.includes("Wallet"), false, "no account names leak");

  await unpublishTrip(tripId);
  assert.equal(await getPublicTripSummary(slug), null);
});

test("trip currency + wallet coherence is enforced", async () => {
  await assert.rejects(
    () =>
      createTrip({
        name: `${TAG} Bad1`,
        destination: "X",
        localCurrency: "MYR",
        startDate: "2026-08-01",
        localWalletAccountId: cashId, // BDT account can't back an MYR trip
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

test("endDate before startDate is rejected", async () => {
  await assert.rejects(
    () =>
      createTrip({
        name: `${TAG} BadDates`,
        destination: "X",
        localCurrency: "BDT",
        startDate: "2026-08-05",
        endDate: "2026-08-01",
      }),
    /on or after/
  );
});

test("a soft-deleted participant cannot be added to new splits", async () => {
  const t = await createTrip({
    name: `${TAG} SoftDelete`,
    destination: "KL",
    localCurrency: "BDT",
    startDate: "2026-09-01",
  });
  const ps = await listParticipants(t.id);
  const me = ps.find((p) => p.isSelf)!.id;
  const dave = (await createParticipant({ tripId: t.id, name: `${TAG} Dave` })).id;
  // Give Dave split history so removal soft-deletes (stays on the trip, inactive).
  await createTripExpense({
    tripId: t.id,
    category: "FOOD",
    date: "2026-09-01",
    payerId: me,
    accountId: cashId,
    amount: 100,
    shares: [{ participantId: me }, { participantId: dave }],
  });
  const res = await deleteParticipant(t.id, dave);
  assert.equal(res.softDeleted, true);
  // Inactive Dave must not be usable as a payer or a share in a NEW expense.
  await assert.rejects(
    () =>
      createTripExpense({
        tripId: t.id,
        category: "FOOD",
        date: "2026-09-02",
        payerId: me,
        accountId: cashId,
        amount: 50,
        shares: [{ participantId: me }, { participantId: dave }],
      }),
    /active participant/
  );
  await assert.rejects(
    () =>
      createTripExpense({
        tripId: t.id,
        category: "FOOD",
        date: "2026-09-02",
        payerId: dave,
        accountId: cashId,
        amount: 50,
        shares: [{ participantId: me }],
      }),
    /active participant/
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
  // Money entries first (their SetNull unlinks any TripExpense), then trips
  // (cascades participants / expenses / shares / settlements), then accounts.
  await db.moneyEntry.deleteMany({
    where: {
      OR: [
        { tripId: { in: tripIds } },
        { accountId: { in: acctIds } },
        { transferAccountId: { in: acctIds } },
      ],
    },
  });
  await db.trip.deleteMany({ where: { id: { in: tripIds } } });
  await db.moneyAccount.deleteMany({ where: { id: { in: acctIds } } });
  await db.$disconnect();
});
