// Currency conversion scenarios against the dev database: converting more than
// the pending income, a foreign→foreign exchange (EUR→USD style), and undoing both.
//
// Run: node --import tsx --test src/services/finance/__tests__/conversion.scenarios.test.ts
//
// convertEarnings consumes EVERY pending earning in a currency, so these tests
// use two currency codes no real record can have (XTS is ISO 4217's reserved
// test code) — the user's actual pending EUR/USD income is never touched. All
// rows are created under a unique TAG and removed in after().
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import {
  convertEarnings,
  createEarning,
  getEarnings,
  reverseConversion,
  updateEarning,
} from "@/services/finance";
import {
  createAccount,
  createEntry,
  deleteEntry,
  ensureCategory,
  getAccountBalance,
} from "@/services/money";
import { db } from "@/lib/db";

const TAG = `__FXTEST_${Date.now()}`;
const SRC = "XTS"; // stands in for EUR
const ALT = "XTE"; // stands in for USD

let sourceId = "";
let accSrc = "";
let accAlt = "";
let accBdt = "";

const round2 = (n: number) => Math.round(n * 100) / 100;
const pending = (currency: string) =>
  db.earning.findMany({
    where: { sourceId, currency, realizedAt: null },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });
const total = (rows: { originalAmount: unknown }[]) =>
  round2(rows.reduce((s, r) => s + Number(r.originalAmount), 0));

before(async () => {
  const source = await db.incomeSource.create({ data: { name: `${TAG} Client` } });
  sourceId = source.id;
  accSrc = (await createAccount({ name: `${TAG} ${SRC}`, type: "BANK", currency: SRC })).id;
  accAlt = (await createAccount({ name: `${TAG} ${ALT}`, type: "BANK", currency: ALT })).id;
  accBdt = (await createAccount({ name: `${TAG} BDT`, type: "BANK", currency: "BDT" })).id;

  // €1,906.74 of pending income credited to the foreign account…
  for (const [date, amount] of [
    ["2026-10-01", 1000],
    ["2026-10-15", 906.74],
  ] as const) {
    await createEarning({
      date,
      sourceId,
      remittance: "REM",
      currency: SRC,
      originalAmount: amount,
      fxRate: 130,
      accountId: accSrc,
    });
  }
  // …plus €1,247.26 that never was pending income (a plain ledger deposit),
  // giving the reported picture: 3,154.00 in the account, 1,906.74 pending.
  const cat = await ensureCategory(`${TAG} Deposit`, "INCOME");
  await createEntry({
    date: "2026-10-20",
    direction: "CREDIT",
    amount: 1247.26,
    categoryId: cat,
    accountId: accSrc,
    fxRate: 130,
  });
});

after(async () => {
  const acctIds = [accSrc, accAlt, accBdt].filter(Boolean);
  await db.earning.deleteMany({ where: { sourceId } });
  await db.moneyEntry.deleteMany({
    where: { OR: [{ accountId: { in: acctIds } }, { transferAccountId: { in: acctIds } }] },
  });
  await db.moneyAccount.deleteMany({ where: { id: { in: acctIds } } });
  await db.moneyCategory.deleteMany({ where: { name: { startsWith: TAG } } });
  await db.incomeSource.deleteMany({ where: { name: { startsWith: TAG } } });
  await db.$disconnect();
});

test("setup: 3,154.00 in the account, 1,906.74 of it pending income", async () => {
  assert.equal(round2(await getAccountBalance(accSrc)), 3154);
  assert.equal(total(await pending(SRC)), 1906.74);
});

test("converting MORE than the pending income works, up to the real balance", async () => {
  const r = await convertEarnings({
    currency: SRC,
    amount: 2473.88,
    fromAccountId: accSrc,
    toAccountId: accBdt,
    date: "2026-11-24",
    toAmount: 336326.59,
  });
  assert.equal(r.realized, true);
  assert.equal(r.converted, 2);
  assert.equal(r.coveredAmount, 1906.74);
  assert.equal(r.uncoveredAmount, 567.14);

  // Money moved in full, in one transfer.
  assert.equal(round2(await getAccountBalance(accSrc)), 680.12);
  assert.equal(round2(await getAccountBalance(accBdt)), 336326.59);

  // Every pending earning is realized — but only for ITS share of the BDT.
  assert.equal((await pending(SRC)).length, 0);
  const realized = await db.earning.findMany({ where: { sourceId, realizedAt: { not: null } } });
  assert.equal(realized.length, 2);
  const booked = round2(realized.reduce((s, e) => s + Number(e.realizedAmount), 0));
  assert.equal(booked, round2((336326.59 * 1906.74) / 2473.88));
  assert.ok(booked < 336326.59, "the non-income excess must not be booked as income");
  assert.ok(realized.every((e) => e.transferEntryId === r.transferEntryId));
});

test("the account's balance is still a hard ceiling", async () => {
  await assert.rejects(
    convertEarnings({
      currency: SRC,
      amount: 680.14,
      fromAccountId: accSrc,
      toAccountId: accBdt,
      date: "2026-11-24",
      toAmount: 90000,
    }),
    /exceeds this account's actual balance/
  );
});

test("reversing the conversion restores pending income and both balances", async () => {
  const [any] = await db.earning.findMany({ where: { sourceId, realizedAt: { not: null } } });
  const r = await reverseConversion(any.id);
  assert.equal(r.kind, "conversion");
  assert.equal(total(await pending(SRC)), 1906.74);
  assert.equal(round2(await getAccountBalance(accSrc)), 3154);
  assert.equal(round2(await getAccountBalance(accBdt)), 0);
});

test("foreign→foreign exchange keeps the income PENDING in the new currency", async () => {
  const r = await convertEarnings({
    currency: SRC,
    amount: 1500,
    fromAccountId: accSrc,
    toAccountId: accAlt,
    date: "2026-11-24",
    toAmount: 1650, // rate 1.1
  });
  assert.equal(r.realized, false);
  assert.equal(r.toCurrency, ALT);
  assert.equal(r.rate, 1.1);
  assert.equal(r.uncoveredAmount, 0);

  assert.equal(round2(await getAccountBalance(accSrc)), 1654);
  assert.equal(round2(await getAccountBalance(accAlt)), 1650);

  // 1,000 moved whole; the 906.74 earning was split: 500 exchanged, 406.74 left behind.
  const alt = await pending(ALT);
  assert.deepEqual(
    alt.map((e) => [
      Number(e.originalAmount),
      e.exchangedFromCurrency,
      Number(e.exchangedFromAmount),
    ]),
    [
      [1100, SRC, 1000],
      [550, SRC, 500],
    ]
  );
  assert.ok(alt.every((e) => e.realizedAt === null && e.exchangeEntryId === r.transferEntryId));
  const left = await pending(SRC);
  assert.deepEqual(
    left.map((e) => Number(e.originalAmount)),
    [406.74]
  );
  // The indicative BDT value travels with the income: 1,000 × 130 = 1,100 × 118.181818.
  assert.equal(Number(alt[0].amount), 130000);

  // Nothing was booked as BDT income.
  assert.equal(await db.earning.count({ where: { sourceId, realizedAt: { not: null } } }), 0);

  // The list surfaces it as pending, with where it came from.
  const listed = await getEarnings({ sourceIds: [sourceId] });
  const exchanged = listed.filter((e) => e.exchangedFromCurrency === SRC);
  assert.equal(exchanged.length, 2);
  assert.ok(exchanged.every((e) => e.pendingConversion && e.currency === ALT));
});

test("an exchanged earning's amount is locked until the exchange is undone", async () => {
  const [e] = await pending(ALT);
  await assert.rejects(updateEarning(e.id, { originalAmount: 5 }), /Undo the exchange/);
  await assert.rejects(updateEarning(e.id, { currency: SRC }), /Undo the exchange/);
  // Non-money fields stay editable — including the way the edit drawer saves,
  // which re-sends the UNCHANGED money fields alongside the note.
  await updateEarning(e.id, { notes: `${TAG} note` });
  await updateEarning(e.id, {
    notes: `${TAG} note 2`,
    currency: e.currency,
    originalAmount: Number(e.originalAmount),
    fxRate: Number(e.fxRate),
  });
  const after = await db.earning.findUniqueOrThrow({ where: { id: e.id } });
  assert.equal(after.notes, `${TAG} note 2`);
  assert.equal(Number(after.originalAmount), Number(e.originalAmount));
  assert.equal(after.exchangedFromCurrency, SRC);
});

test("exchanged income cannot be exchanged again (one hop keeps the undo whole)", async () => {
  const third = await createAccount({ name: `${TAG} XTF`, type: "BANK", currency: "XTF" });
  const before = round2(await getAccountBalance(accAlt));
  try {
    await assert.rejects(
      convertEarnings({
        currency: ALT,
        amount: 100,
        fromAccountId: accAlt,
        toAccountId: third.id,
        date: "2026-11-24",
        toAmount: 90,
      }),
      /chained exchanges are not supported/
    );
    // Refused before anything moved.
    assert.equal(round2(await getAccountBalance(accAlt)), before);
    assert.equal(round2(await getAccountBalance(third.id)), 0);
  } finally {
    await db.moneyAccount.delete({ where: { id: third.id } });
  }
});

test("the exchange transfer can't be deleted from the Ledger behind the earnings' back", async () => {
  const [e] = await pending(ALT);
  await assert.rejects(deleteEntry(e.exchangeEntryId as string), /Reverse it from/);
  assert.equal(round2(await getAccountBalance(accAlt)), 1650);
});

test("two conversions fired at once cannot both spend the same balance", async () => {
  // 1,654.00 left in the source account; each request alone is affordable, both are not.
  const attempt = () =>
    convertEarnings({
      currency: SRC,
      amount: 1000,
      fromAccountId: accSrc,
      toAccountId: accBdt,
      date: "2026-11-24",
      toAmount: 130000,
    });
  const results = await Promise.allSettled([attempt(), attempt()]);
  const ok = results.filter((r) => r.status === "fulfilled");
  const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  assert.equal(ok.length, 1);
  assert.equal(failed.length, 1);
  assert.match(String(failed[0].reason?.message), /exceeds this account's actual balance/);
  assert.equal(round2(await getAccountBalance(accSrc)), 654);

  // Put it back so the following tests see the post-exchange state again.
  const [done] = await db.earning.findMany({ where: { sourceId, realizedAt: { not: null } } });
  if (done) await reverseConversion(done.id);
  else {
    // No pending SRC earning was large enough to be touched: remove the plain transfer.
    await db.moneyEntry.deleteMany({
      where: { accountId: accSrc, transferAccountId: accBdt, direction: "TRANSFER" },
    });
  }
  assert.equal(round2(await getAccountBalance(accSrc)), 1654);
  assert.equal(round2(await getAccountBalance(accBdt)), 0);
});

test("a conversion between two accounts in the same currency is refused", async () => {
  const twin = await createAccount({ name: `${TAG} ${ALT} twin`, type: "BANK", currency: ALT });
  try {
    await assert.rejects(
      convertEarnings({
        currency: ALT,
        amount: 10,
        fromAccountId: accAlt,
        toAccountId: twin.id,
        date: "2026-11-24",
        toAmount: 10,
      }),
      /transfer, not a conversion/
    );
  } finally {
    await db.moneyAccount.delete({ where: { id: twin.id } });
  }
});

test("exchanged income realizes normally on a later →BDT conversion", async () => {
  const r = await convertEarnings({
    currency: ALT,
    amount: 1100,
    fromAccountId: accAlt,
    toAccountId: accBdt,
    date: "2026-11-25",
    toAmount: 132000,
  });
  assert.equal(r.realized, true);
  assert.equal(r.converted, 1);
  const [done] = await db.earning.findMany({ where: { sourceId, realizedAt: { not: null } } });
  assert.equal(Number(done.realizedAmount), 132000);
  assert.equal(done.currency, ALT);

  // The exchange can't be undone while part of it sits converted in BDT…
  const [stillPending] = await pending(ALT);
  await assert.rejects(reverseConversion(stillPending.id), /Reverse that conversion first/);

  // …so the BDT conversion is reversed first.
  assert.equal((await reverseConversion(done.id)).kind, "conversion");
  assert.equal(total(await pending(ALT)), 1650);
});

test("undoing the exchange restores the original currency, amounts and balances", async () => {
  const [any] = await pending(ALT);
  const r = await reverseConversion(any.id);
  assert.equal(r.kind, "exchange");

  assert.equal((await pending(ALT)).length, 0);
  const back = await pending(SRC);
  // Split rows are restored separately (not merged) but lose nothing.
  assert.deepEqual(
    back.map((e) => Number(e.originalAmount)).sort((a, b) => a - b),
    [406.74, 500, 1000]
  );
  assert.equal(total(back), 1906.74);
  assert.ok(back.every((e) => e.exchangeEntryId === null && e.exchangedFromCurrency === null));
  assert.ok(back.every((e) => Number(e.fxRate) === 130));

  assert.equal(round2(await getAccountBalance(accSrc)), 3154);
  assert.equal(round2(await getAccountBalance(accAlt)), 0);
  assert.equal(round2(await getAccountBalance(accBdt)), 0);
});

test("an earning with nothing to reverse is refused", async () => {
  const [plain] = await pending(SRC);
  await assert.rejects(reverseConversion(plain.id), /no conversion or exchange to reverse/);
  await assert.rejects(reverseConversion("does-not-exist"), /Earning not found/);
});

test("bad input is rejected before anything is written", async () => {
  const base = {
    currency: SRC,
    fromAccountId: accSrc,
    toAccountId: accBdt,
    date: "2026-11-24",
    amount: 10,
    toAmount: 1300,
  };
  const entriesBefore = await db.moneyEntry.count({ where: { accountId: accSrc } });
  await assert.rejects(convertEarnings({ ...base, amount: NaN }), /greater than 0/);
  await assert.rejects(convertEarnings({ ...base, amount: -5 }), /greater than 0/);
  await assert.rejects(convertEarnings({ ...base, toAmount: Infinity }), /greater than 0/);
  await assert.rejects(convertEarnings({ ...base, date: "not-a-date" }), /not a valid date/);
  await assert.rejects(convertEarnings({ ...base, date: "1" }), /not a valid date/);
  await assert.rejects(convertEarnings({ ...base, date: "2026-02-31x" }), /not a valid date/);
  await assert.rejects(convertEarnings({ ...base, date: "2026-02-31" }), /not a valid date/);
  await assert.rejects(convertEarnings({ ...base, amount: 5e12 }), /too large/);
  await assert.rejects(
    convertEarnings({ ...base, amount: "10" as unknown as number }),
    /greater than 0/
  );
  await assert.rejects(convertEarnings({ ...base, notes: "x".repeat(2001) }), /at most 2000/);
  await assert.rejects(
    convertEarnings({ ...base, toAmount: 0.000001 }),
    /greater than 0|too small/
  );
  await assert.rejects(convertEarnings({ ...base, currency: "BDT" }), /foreign currency/);
  await assert.rejects(convertEarnings({ ...base, currency: ALT }), /must be a XTE account/);
  await assert.rejects(convertEarnings({ ...base, toAccountId: "nope" }), /account not found/);
  assert.equal(await db.moneyEntry.count({ where: { accountId: accSrc } }), entriesBefore);
});

test("earnings can be listed by income type", async () => {
  await createEarning({
    date: "2026-11-01",
    sourceId,
    remittance: "NON_REM",
    amount: 5000,
  });
  const rem = await getEarnings({ sourceIds: [sourceId], remittance: "REM" });
  const non = await getEarnings({ sourceIds: [sourceId], remittance: "NON_REM" });
  const all = await getEarnings({ sourceIds: [sourceId] });
  assert.ok(rem.length > 0 && rem.every((e) => e.remittance === "REM"));
  assert.deepEqual(
    non.map((e) => [e.remittance, e.amount]),
    [["NON_REM", 5000]]
  );
  assert.equal(all.length, rem.length + non.length);
});
