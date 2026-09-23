// The behaviour of the shared <NumberField>. No DB, no network — `npm run test`.
//
// The component is a thin shell over lib/numberField.ts, so these tests cover
// what a user sees: what the parent form receives while typing, what happens on
// leaving the field, and what the helper line says. The arithmetic itself is
// covered in calcExpression.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emittedValue,
  fieldStatus,
  resolveNumberInput,
  sanitizeNumberInput,
  settleDraft,
  toDisplay,
} from "../numberField";

// ─── typing: what the parent receives ────────────────────────────────────────

test("a plain number reaches the parent as-is", () => {
  assert.equal(emittedValue("1000"), "1000");
  assert.equal(emittedValue("12.5"), "12.5");
});

test("a finished expression reaches the parent as its result", () => {
  assert.equal(emittedValue("200 + 300 + 500"), "1000");
  assert.equal(emittedValue("1500 * 3 - 200"), "4300");
  assert.equal(emittedValue("(100 + 50) / 3"), "50");
});

test("an unfinished expression gives the parent nothing, never a partial read", () => {
  // parseFloat("200 + 300 +") would be 200 — the bug this contract prevents.
  assert.equal(emittedValue("200 +"), "");
  assert.equal(emittedValue("(200 + 300"), "");
  assert.equal(emittedValue("200 + 300 +"), "");
});

test("an empty field gives the parent an empty string", () => {
  assert.equal(emittedValue(""), "");
  assert.equal(emittedValue("   "), "");
});

test("money rounds to 2 decimals by default, without float noise", () => {
  assert.equal(emittedValue("0.1 + 0.2"), "0.3");
  assert.equal(emittedValue("10 / 3"), "3.33");
});

test("a field can ask for more precision (FX rates, tariffs)", () => {
  assert.equal(emittedValue("1 / 3", { decimals: 6 }), "0.333333");
  assert.equal(emittedValue("119.5 + 0.0125", { decimals: 4 }), "119.5125");
});

test("negative numbers are allowed unless a minimum says otherwise", () => {
  assert.equal(emittedValue("-5000"), "-5000");
  assert.equal(emittedValue("100 - 250"), "-150");
  assert.equal(emittedValue("-5", { min: 0 }), "");
});

// ─── rules ───────────────────────────────────────────────────────────────────

test("whole-number fields accept integers and integer-valued expressions", () => {
  assert.equal(emittedValue("30", { integer: true }), "30");
  assert.equal(emittedValue("15 * 2", { integer: true }), "30");
  assert.equal(emittedValue("10 / 4 * 2", { integer: true }), "5");
});

test("whole-number fields reject fractions instead of rounding them", () => {
  // Rounding 2.5 to 3 would store a number nobody typed.
  const r = resolveNumberInput("10 / 4", { integer: true });
  assert.deepEqual(r, { kind: "invalid", reason: "Must be a whole number" });
  assert.equal(emittedValue("7.5", { integer: true }), "");
  assert.equal(emittedValue("10 / 3", { integer: true }), "");
});

test("min and max are enforced on the result, not the text", () => {
  assert.equal(emittedValue("50 + 50", { min: 0, max: 100 }), "100");
  assert.deepEqual(resolveNumberInput("60 + 50", { max: 100 }), {
    kind: "invalid",
    reason: "Must be at most 100",
  });
  assert.deepEqual(resolveNumberInput("5 - 10", { min: 0 }), {
    kind: "invalid",
    reason: "Must be at least 0",
  });
  // The boundaries themselves are allowed.
  assert.equal(emittedValue("0", { min: 0 }), "0");
  assert.equal(emittedValue("100", { max: 100 }), "100");
});

test("resolveNumberInput distinguishes empty from invalid", () => {
  assert.deepEqual(resolveNumberInput(""), { kind: "empty" });
  assert.deepEqual(resolveNumberInput("2 +"), { kind: "invalid", reason: "Not a valid number" });
  assert.deepEqual(resolveNumberInput("2 + 2"), { kind: "ok", value: 4, text: "4" });
});

// ─── sanitising keystrokes ───────────────────────────────────────────────────

test("keystrokes outside the grammar are dropped as typed", () => {
  assert.equal(sanitizeNumberInput("1,000"), "1000");
  assert.equal(sanitizeNumberInput("৳500"), "500");
  assert.equal(sanitizeNumberInput("1e5"), "15");
  assert.equal(sanitizeNumberInput("alert(1)"), "(1)");
  assert.equal(sanitizeNumberInput("200 + 300"), "200 + 300");
});

// ─── leaving the field ───────────────────────────────────────────────────────

test("leaving a valid expression drops the draft so the resolved value shows", () => {
  assert.deepEqual(settleDraft("200 + 300"), { draft: null, error: null });
});

test("leaving an empty field is not an error", () => {
  assert.deepEqual(settleDraft(""), { draft: null, error: null });
  assert.deepEqual(settleDraft("  "), { draft: null, error: null });
});

test("leaving an invalid expression keeps the text so it can be fixed", () => {
  assert.deepEqual(settleDraft("200 +"), { draft: "200 +", error: "Not a valid number" });
});

test("leaving a rule-breaking value keeps the text with the rule as the error", () => {
  assert.deepEqual(settleDraft("2.5", { integer: true }), {
    draft: "2.5",
    error: "Must be a whole number",
  });
  assert.deepEqual(settleDraft("-1", { min: 0 }), { draft: "-1", error: "Must be at least 0" });
});

// ─── the helper line ─────────────────────────────────────────────────────────

test("a running total shows while typing an expression", () => {
  assert.deepEqual(fieldStatus("200 + 300 + 500", null), { error: false, text: "= 1,000" });
});

test("a plain number shows no preview of itself; the parent's helper text stands", () => {
  assert.deepEqual(fieldStatus("1000", null), { error: false, text: null });
  assert.deepEqual(fieldStatus(null, null), { error: false, text: null });
});

test("an unfinished expression stays quiet while typing", () => {
  assert.deepEqual(fieldStatus("200 +", null), { error: false, text: null });
});

test("a rule-breaking expression shows no misleading total", () => {
  assert.deepEqual(fieldStatus("10 / 4", null, { integer: true }), { error: false, text: null });
});

test("a settle error wins over everything else", () => {
  assert.deepEqual(fieldStatus("200 +", "Not a valid number"), {
    error: true,
    text: "Not a valid number",
  });
});

// ─── display ─────────────────────────────────────────────────────────────────

test("the parent's value displays whether it is held as a string or number", () => {
  assert.equal(toDisplay("1500"), "1500");
  assert.equal(toDisplay(1500), "1500");
  assert.equal(toDisplay(0), "0");
  assert.equal(toDisplay(""), "");
  assert.equal(toDisplay(null), "");
  assert.equal(toDisplay(undefined), "");
});
