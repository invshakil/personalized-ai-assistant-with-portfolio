// The Convert drawer's rules. Pure — no React, no database.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  conversionCheck,
  convertibleCurrencies,
  crossRate,
  pendingByCurrency,
} from "../convertForm";

const acct = (currency: string, balance: number, over: object = {}) => ({
  currency,
  balance,
  isActive: true,
  accountTypeActive: true,
  ...over,
});

test("converting more than the pending income is allowed up to the real balance", () => {
  // The reported case: €3,154.00 available, €1,906.74 pending, converting €2,473.88.
  const c = conversionCheck({ amount: 2473.88, balance: 3154, pendingTotal: 1906.74 });
  assert.equal(c.exceedsBalance, false);
  assert.equal(c.covered, 1906.74);
  assert.equal(c.uncovered, 567.14);
});

test("only the account's balance blocks a conversion", () => {
  assert.equal(
    conversionCheck({ amount: 3154.02, balance: 3154, pendingTotal: 5000 }).exceedsBalance,
    true
  );
  // A cent of float noise is tolerated.
  assert.equal(
    conversionCheck({ amount: 3154.01, balance: 3154, pendingTotal: 5000 }).exceedsBalance,
    false
  );
});

test("an amount within the pending income is fully covered", () => {
  const c = conversionCheck({ amount: 500, balance: 3154, pendingTotal: 1906.74 });
  assert.deepEqual(c, { exceedsBalance: false, covered: 500, uncovered: 0 });
  assert.equal(conversionCheck({ amount: 0, balance: 10, pendingTotal: 5 }).uncovered, 0);
});

test("pending income is grouped per currency beside the real balance", () => {
  const grouped = pendingByCurrency(
    [
      { currency: "EUR", originalAmount: 1000 },
      { currency: "EUR", originalAmount: 906.74 },
      { currency: "USD", originalAmount: 907.5 },
    ],
    [acct("EUR", 3154), acct("USD", 10), acct("BDT", 726118)]
  );
  assert.deepEqual(grouped, [
    { currency: "EUR", original: 1906.74, count: 2, availableBalance: 3154 },
    { currency: "USD", original: 907.5, count: 1, availableBalance: 10 },
  ]);
});

test("convertible currencies: pending ones, plus any foreign balance actually held", () => {
  const accounts = [
    acct("BDT", 5000),
    acct("EUR", 3154),
    acct("MYR", 91.8),
    acct("GBP", 0), // empty — nothing to convert
    acct("CHF", 50, { isActive: false }), // archived
    acct("JPY", 50, { accountTypeActive: false }), // type archived
  ];
  const pending = [{ currency: "USD", original: 907.5, count: 1, availableBalance: 0 }];
  assert.deepEqual(convertibleCurrencies(pending, accounts), ["USD", "EUR", "MYR"]);
  // No pending income at all: a foreign balance is still convertible.
  assert.deepEqual(convertibleCurrencies([], accounts), ["EUR", "MYR"]);
  assert.deepEqual(convertibleCurrencies([], [acct("BDT", 100)]), []);
});

test("crossRate quotes foreign→foreign through each side's BDT rate", () => {
  assert.equal(crossRate(135.95, 1), 135.95); // EUR → BDT
  assert.ok(Math.abs(crossRate(135.95, 121) - 1.12355) < 0.0001); // EUR → USD
  assert.equal(crossRate(0, 121), 0);
  assert.equal(crossRate(135.95, 0), 0);
});
