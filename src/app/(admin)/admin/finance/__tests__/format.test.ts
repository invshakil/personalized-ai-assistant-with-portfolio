// Amount formatting for balances/statements. Pure.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fmtCurrency, fmtCurrencyExact } from "../format";

test("fmtCurrencyExact keeps the paisa on BDT balances (lakh grouping)", () => {
  assert.equal(fmtCurrencyExact(726118.45, "BDT"), "৳7,26,118.45");
  assert.equal(fmtCurrencyExact(2740, "BDT"), "৳2,740.00");
  assert.equal(fmtCurrencyExact(0.5, "BDT"), "৳0.50");
  // The compact list formatter still rounds BDT to the taka.
  assert.equal(fmtCurrency(726118.45, "BDT"), "৳7,26,118");
});

test("fmtCurrencyExact formats foreign currencies with their own symbol", () => {
  assert.equal(fmtCurrencyExact(3154, "EUR"), "€3,154.00");
  assert.equal(fmtCurrencyExact(10, "USD"), "$10.00");
  assert.equal(fmtCurrencyExact(91.8, "MYR"), "RM91.80");
});

test("fmtCurrencyExact handles negatives and float noise", () => {
  assert.equal(fmtCurrencyExact(-1500.5, "BDT"), "-৳1,500.50");
  assert.equal(fmtCurrencyExact(0.1 + 0.2 - 0.3, "BDT"), "৳0.00");
  assert.equal(fmtCurrencyExact(-0.001, "EUR"), "€0.00");
  assert.equal(fmtCurrencyExact(1906.7400000001, "EUR"), "€1,906.74");
});
