// The arithmetic behind the amount inputs. No DB, no network — `npm run test`.
//
// Two things matter here beyond "does the maths work". First, a partial
// expression must be rejected rather than half-read: parseFloat("200 + 300") is
// 200, so a lenient parser would silently save the wrong figure. Second, the
// input is a form field, so the rejection tests are the security tests — the
// parser must have no path to an interpreter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateExpression, isExpression, toAmountString } from "../calcExpression";

const value = (input: string) => evaluateExpression(input).value;
const rejects = (input: string) => assert.equal(evaluateExpression(input).ok, false, input);

test("a plain number evaluates to itself", () => {
  assert.equal(value("1000"), 1000);
  assert.equal(value("0.5"), 0.5);
  assert.equal(value(".5"), 0.5);
  assert.equal(value("  42  "), 42);
});

test("the case this was built for: a chain of additions", () => {
  assert.equal(value("200 + 300 + 500"), 1000);
  assert.equal(value("200+300+500"), 1000);
});

test("operator precedence and brackets are respected", () => {
  assert.equal(value("2 + 3 * 4"), 14);
  assert.equal(value("(2 + 3) * 4"), 20);
  assert.equal(value("2 * (3 + (4 - 1))"), 12);
});

test("subtraction, division and unary minus", () => {
  assert.equal(value("1000 - 250"), 750);
  assert.equal(value("1000 / 4"), 250);
  assert.equal(value("-50 + 200"), 150);
  assert.equal(value("100 - -50"), 150);
});

test("float noise is rounded away, because these are money amounts", () => {
  assert.equal(value("0.1 + 0.2"), 0.3);
  assert.equal(value("1 / 3"), 0.33);
  assert.equal(toAmountString(0.30000000000000004), "0.3");
});

test("an unfinished expression is rejected, never half-read", () => {
  // The dangerous case: parseFloat would return 200 for each of these.
  rejects("200 +");
  rejects("200 + ");
  rejects("200 * ");
  rejects("200 + (300");
  rejects("+");
});

test("malformed arithmetic is rejected", () => {
  rejects("2 3");
  rejects("2 + 3)");
  rejects("(2 + 3");
  rejects("2 +* 3");
  rejects("1.2.3");
  rejects("");
  rejects("   ");
});

test("division by zero is not an amount", () => {
  rejects("1 / 0");
  rejects("100 / (5 - 5)");
});

test("nothing that is not arithmetic gets through", () => {
  // These are the tests that matter: there is no interpreter behind this, and
  // these assertions are what keeps it that way.
  rejects("alert(1)");
  rejects("process.exit(1)");
  rejects("1; 2");
  rejects("2 ** 8");
  rejects("0x10");
  rejects("1e3");
  rejects("require('fs')");
  rejects("__proto__");
  rejects("200 + 300; drop table");
});

test("isExpression tells a sum from a single number", () => {
  assert.equal(isExpression("200 + 300"), true);
  assert.equal(isExpression("(200)"), true);
  assert.equal(isExpression("1000"), false);
  assert.equal(isExpression("0.5"), false);
  assert.equal(isExpression("-50"), false, "a leading sign is not arithmetic");
});
