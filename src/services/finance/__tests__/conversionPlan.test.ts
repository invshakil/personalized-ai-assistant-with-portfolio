// Allocation maths for converting out of a foreign account. Pure — no database.
// Run: node --import tsx --test src/services/finance/__tests__/conversionPlan.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { planConversion, splitProRata } from "@/services/finance/conversionPlan";

const sum = (ns: number[]) => Math.round(ns.reduce((s, n) => s + n, 0) * 100) / 100;

test("an amount on an earning boundary consumes whole earnings, no split", () => {
  const plan = planConversion({
    amount: 1500,
    toAmount: 195000,
    pending: [
      { id: "a", orig: 1000 },
      { id: "b", orig: 500 },
      { id: "c", orig: 700 },
    ],
  });
  assert.equal(plan.rate, 130);
  assert.equal(plan.split, null);
  assert.deepEqual(
    plan.allocations.map((a) => [a.id, a.orig, a.dest]),
    [
      ["a", 1000, 130000],
      ["b", 500, 65000],
    ]
  );
  assert.equal(plan.coveredSource, 1500);
  assert.equal(plan.uncoveredSource, 0);
  assert.equal(plan.coveredDest, 195000);
});

test("an amount inside an earning splits it into consumed + leftover", () => {
  const plan = planConversion({
    amount: 1200,
    toAmount: 156000,
    pending: [
      { id: "a", orig: 1000 },
      { id: "b", orig: 500 },
    ],
  });
  assert.deepEqual(plan.split, { id: "b", consumed: 200, leftover: 300 });
  assert.deepEqual(
    plan.allocations.map((a) => [a.id, a.orig]),
    [
      ["a", 1000],
      ["b", 200],
    ]
  );
  assert.equal(sum(plan.allocations.map((a) => a.dest)), 156000);
});

test("MORE than the pending income is allowed: the excess is left uncovered", () => {
  // The reported case: €3,154.00 in the account, €1,906.74 pending, converting €2,473.88.
  const plan = planConversion({
    amount: 2473.88,
    toAmount: 336326.59,
    pending: [
      { id: "a", orig: 1000 },
      { id: "b", orig: 906.74 },
    ],
  });
  assert.equal(plan.coveredSource, 1906.74);
  assert.equal(plan.uncoveredSource, 567.14);
  assert.equal(plan.split, null);
  assert.equal(plan.allocations.length, 2);
  // Only the earnings' pro-rata share of the BDT is attributed to them…
  const expected = Math.round(((336326.59 * 1906.74) / 2473.88) * 100) / 100;
  assert.equal(plan.coveredDest, expected);
  // …and the parts sum to it exactly, despite per-earning rounding.
  assert.equal(sum(plan.allocations.map((a) => a.dest)), expected);
  assert.ok(plan.coveredDest < 336326.59);
});

test("no pending income at all is a plain exchange — nothing allocated", () => {
  const plan = planConversion({ amount: 100, toAmount: 110, pending: [] });
  assert.deepEqual(plan.allocations, []);
  assert.equal(plan.coveredSource, 0);
  assert.equal(plan.uncoveredSource, 100);
  assert.equal(plan.coveredDest, 0);
  assert.equal(plan.rate, 1.1);
});

test("rounding remainder lands on the largest allocation so parts sum to the total", () => {
  const plan = planConversion({
    amount: 300,
    toAmount: 100, // rate 0.333333 → three 33.33 shares would only sum to 99.99
    pending: [
      { id: "a", orig: 100 },
      { id: "b", orig: 100 },
      { id: "c", orig: 100 },
    ],
  });
  assert.equal(sum(plan.allocations.map((a) => a.dest)), 100);
});

test("a cent of float noise does not create a phantom split or excess", () => {
  const plan = planConversion({
    amount: 0.3,
    toAmount: 39,
    pending: [
      { id: "a", orig: 0.1 },
      { id: "b", orig: 0.2 }, // 0.1 + 0.2 = 0.30000000000000004
    ],
  });
  assert.equal(plan.split, null);
  assert.equal(plan.uncoveredSource, 0);
  assert.equal(plan.allocations.length, 2);
});

test("non-positive amounts are rejected", () => {
  assert.throws(() => planConversion({ amount: 0, toAmount: 10, pending: [] }), /greater than 0/);
  assert.throws(() => planConversion({ amount: 10, toAmount: 0, pending: [] }), /greater than 0/);
  assert.throws(() => planConversion({ amount: NaN, toAmount: 5, pending: [] }), /greater than 0/);
});

test("splitProRata divides a remembered amount and loses no cents", () => {
  const { consumed, leftover } = splitProRata(1000, 333.33, 1100);
  assert.equal(Math.round((consumed + leftover) * 100) / 100, 1000);
  assert.equal(consumed, 303.03);
  assert.deepEqual(splitProRata(50, 10, 0), { consumed: 50, leftover: 0 });
});

test("a received amount too small to attribute is refused, never written as zero", () => {
  // A 0.10 earning at rate 0.01 would round to a 0.00 share.
  assert.throws(
    () =>
      planConversion({
        amount: 100.1,
        toAmount: 1,
        pending: [
          { id: "a", orig: 0.1 },
          { id: "b", orig: 100 },
        ],
      }),
    /too small to attribute/
  );
  // A rate that rounds to 0 at 6 decimals.
  assert.throws(
    () => planConversion({ amount: 1_000_000, toAmount: 0.01, pending: [] }),
    /too small/
  );
});

test("no allocation is ever zero or negative across awkward rates", () => {
  for (const rate of [0.0065, 0.07, 0.3333, 1.1, 135.9511]) {
    const pending = Array.from({ length: 40 }, (_, i) => ({ id: `e${i}`, orig: 1 + i * 0.37 }));
    const amount = Math.round(pending.reduce((s, p) => s + p.orig, 0) * 100) / 100;
    const toAmount = Math.round(amount * rate * 100) / 100;
    let plan;
    try {
      plan = planConversion({ amount, toAmount, pending });
    } catch (e) {
      assert.match((e as Error).message, /too small/);
      continue;
    }
    assert.ok(plan.allocations.every((a) => a.dest > 0));
    assert.equal(sum(plan.allocations.map((a) => a.dest)), plan.coveredDest);
  }
});
