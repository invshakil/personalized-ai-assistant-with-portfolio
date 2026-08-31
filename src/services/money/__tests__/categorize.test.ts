// Unit tests for the guard between a model response and a shown suggestion.
// No DB, no network — these run in `npm run test`.
//
// This is the layer that matters most for embedded AI. The JSON Schema on the
// request constrains the *shape* of the response, so everything here is about
// what a well-formed but wrong answer can do: name a category that doesn't
// exist, file a DEBIT under an income category, answer about a line that isn't
// in the file, or return a confidence we shouldn't act on.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MoneyCategoryKind } from "@prisma/client";
import { reconcileAssignments, suggestionKey, type ValidCategories } from "../categorize";
import { validateSuggestionRecord } from "../import";

const VALID: ValidCategories = new Map([
  [
    MoneyCategoryKind.EXPENSE,
    new Map([
      ["groceries", "Groceries"],
      ["transport", "Transport"],
      ["utilities", "Utilities"],
    ]),
  ],
  [
    MoneyCategoryKind.INCOME,
    new Map([
      ["salary", "Salary"],
      ["refunds", "Refunds"],
    ]),
  ],
]);

const asked = (...items: [string, "CREDIT" | "DEBIT"][]) =>
  new Set(items.map(([d, dir]) => suggestionKey(d, dir)));

const assignment = (
  description: string,
  direction: string,
  categoryName: string,
  confidence = 0.9
) => ({ description, direction, categoryName, confidence });

test("accepts a valid assignment and returns the canonical category name", () => {
  const got = reconcileAssignments(
    // Model echoes lowercase; we must store the user's own capitalisation.
    [assignment("SHWAPNO SUPERSTORE", "DEBIT", "groceries", 0.92)],
    VALID,
    asked(["SHWAPNO SUPERSTORE", "DEBIT"])
  );
  assert.equal(got.size, 1);
  const hit = got.get(suggestionKey("SHWAPNO SUPERSTORE", "DEBIT"));
  assert.equal(hit?.categoryName, "Groceries");
  assert.equal(hit?.confidence, 0.92);
});

test("drops a category the user does not have", () => {
  const got = reconcileAssignments(
    [assignment("NETFLIX", "DEBIT", "Entertainment")],
    VALID,
    asked(["NETFLIX", "DEBIT"])
  );
  assert.equal(got.size, 0, "an invented category must never reach the preview");
});

test("drops a category whose kind contradicts the direction", () => {
  // "Salary" exists, but as INCOME — it cannot categorise a DEBIT.
  const got = reconcileAssignments(
    [assignment("MONTHLY PAYOUT", "DEBIT", "Salary")],
    VALID,
    asked(["MONTHLY PAYOUT", "DEBIT"])
  );
  assert.equal(got.size, 0);
});

test("accepts the same category name for the direction it does match", () => {
  const got = reconcileAssignments(
    [assignment("MONTHLY PAYOUT", "CREDIT", "Salary")],
    VALID,
    asked(["MONTHLY PAYOUT", "CREDIT"])
  );
  assert.equal(got.get(suggestionKey("MONTHLY PAYOUT", "CREDIT"))?.categoryName, "Salary");
});

test("drops a line that was never asked about", () => {
  const got = reconcileAssignments(
    [assignment("A LINE NOT IN THE FILE", "DEBIT", "Groceries")],
    VALID,
    asked(["SOMETHING ELSE", "DEBIT"])
  );
  assert.equal(got.size, 0, "the model must not be able to add rows to the import");
});

test("drops low-confidence suggestions rather than showing a weak guess", () => {
  // 0.35 is the real case the eval caught: the model scored an opaque reference
  // line here and the old threshold let it through as a confident answer.
  for (const confidence of [0.2, 0.35, 0.49]) {
    const got = reconcileAssignments(
      [assignment("TRF 88213366", "DEBIT", "Groceries", confidence)],
      VALID,
      asked(["TRF 88213366", "DEBIT"])
    );
    assert.equal(got.size, 0, `confidence ${confidence} should be withheld`);
  }
});

test("keeps a suggestion at the confidence threshold", () => {
  const got = reconcileAssignments(
    [assignment("SHOP", "DEBIT", "Groceries", 0.5)],
    VALID,
    asked(["SHOP", "DEBIT"])
  );
  assert.equal(got.size, 1);
});

test("treats a non-numeric or missing confidence as no confidence", () => {
  const bad = [
    { description: "X", direction: "DEBIT", categoryName: "Groceries" },
    { description: "X", direction: "DEBIT", categoryName: "Groceries", confidence: NaN },
    { description: "X", direction: "DEBIT", categoryName: "Groceries", confidence: "high" },
  ] as unknown as Parameters<typeof reconcileAssignments>[0];
  const got = reconcileAssignments(bad, VALID, asked(["X", "DEBIT"]));
  assert.equal(got.size, 0);
});

test("clamps an out-of-range confidence instead of surfacing it raw", () => {
  const got = reconcileAssignments(
    [assignment("SHOP", "DEBIT", "Groceries", 4.2)],
    VALID,
    asked(["SHOP", "DEBIT"])
  );
  assert.equal(got.get(suggestionKey("SHOP", "DEBIT"))?.confidence, 1);
});

test("ignores an invalid direction", () => {
  const got = reconcileAssignments(
    [assignment("SHOP", "TRANSFER", "Groceries")],
    VALID,
    asked(["SHOP", "DEBIT"])
  );
  assert.equal(got.size, 0);
});

test("survives a malformed response without throwing", () => {
  const junk = [null, undefined, {}, { description: 1 }] as unknown as Parameters<
    typeof reconcileAssignments
  >[0];
  assert.doesNotThrow(() => reconcileAssignments(junk, VALID, asked(["SHOP", "DEBIT"])));
  assert.equal(reconcileAssignments(junk, VALID, asked(["SHOP", "DEBIT"])).size, 0);
});

test("matches descriptions case- and whitespace-insensitively", () => {
  const got = reconcileAssignments(
    [assignment("  shwapno superstore  ", "DEBIT", "Groceries")],
    VALID,
    asked(["SHWAPNO SUPERSTORE", "DEBIT"])
  );
  assert.equal(got.size, 1, "the model's echo should not have to be byte-identical");
});

test("last valid assignment wins when the model repeats a line", () => {
  const got = reconcileAssignments(
    [assignment("SHOP", "DEBIT", "Groceries", 0.8), assignment("SHOP", "DEBIT", "Transport", 0.6)],
    VALID,
    asked(["SHOP", "DEBIT"])
  );
  assert.equal(got.size, 1);
  assert.equal(got.get(suggestionKey("SHOP", "DEBIT"))?.categoryName, "Transport");
});

// ─── Commit-time validation of the client-replayed suggestion map ────────────
//
// The preview guard above constrains what the MODEL may propose. These pin the
// second pass: `aiCategories` comes back from the browser on commit, so the same
// two rules (category must exist, kind must match direction) are re-enforced
// server-side rather than trusted.

test("commit: accepts a replayed suggestion that is still valid", () => {
  const got = validateSuggestionRecord({ "DEBIT|shwapno superstore": "Groceries" }, VALID);
  assert.equal(got.get("DEBIT|shwapno superstore")?.categoryName, "Groceries");
});

test("commit: refuses a category that does not exist", () => {
  // Without this the name would reach ensureCategory and be created on the fly.
  const got = validateSuggestionRecord({ "DEBIT|netflix": "Entertainment" }, VALID);
  assert.equal(got.size, 0);
});

test("commit: refuses a category whose kind contradicts the key's direction", () => {
  const got = validateSuggestionRecord({ "DEBIT|monthly payout": "Salary" }, VALID);
  assert.equal(got.size, 0);
  const ok = validateSuggestionRecord({ "CREDIT|monthly payout": "Salary" }, VALID);
  assert.equal(ok.get("CREDIT|monthly payout")?.categoryName, "Salary");
});

test("commit: refuses a key that the preview could not have produced", () => {
  const got = validateSuggestionRecord(
    { "shwapno superstore": "Groceries", "TRANSFER|x": "Groceries", "": "Groceries" },
    VALID
  );
  assert.equal(got.size, 0);
});

test("commit: normalises to the stored capitalisation", () => {
  const got = validateSuggestionRecord({ "DEBIT|agora": "  gRoCeRiEs  " }, VALID);
  assert.equal(got.get("DEBIT|agora")?.categoryName, "Groceries");
});

test("commit: survives a missing or malformed map without throwing", () => {
  const junk = {
    "DEBIT|a": 42,
    "DEBIT|b": null,
    "DEBIT|c": "",
    "DEBIT|d": "   ",
  } as unknown as Record<string, string>;
  assert.equal(validateSuggestionRecord(undefined, VALID).size, 0);
  assert.equal(validateSuggestionRecord({}, VALID).size, 0);
  assert.equal(validateSuggestionRecord(junk, VALID).size, 0);
});
