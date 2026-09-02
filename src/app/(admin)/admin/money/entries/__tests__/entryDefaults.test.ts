// The direction ↔ category-kind pairing, and what a new entry may be seeded with.
// No DB, no network — these run in `npm run test`.
//
// This is the rule a dropdown default can quietly violate. A stored default is
// checked against a list of allowed ids before it is applied; if that list is
// wider than the one the dropdown renders, the value passes the check, shows as
// an empty field (SearchableSelect resolves an unmatched value to null) and is
// then refused by the server on save. So the two lists have to be the same list.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MoneyCategoryKind } from "@prisma/client";
import type { MoneyCategoryRow } from "@/types";
import { BLANK_ENTRY, categoryIdsFor, categoryKindFor } from "../types";

const cat = (id: string, kind: MoneyCategoryKind): MoneyCategoryRow => ({
  id,
  name: id,
  kind,
  isActive: true,
  entryCount: 0,
});

const CATEGORIES: MoneyCategoryRow[] = [
  cat("groceries", MoneyCategoryKind.EXPENSE),
  cat("cement", MoneyCategoryKind.EXPENSE),
  cat("salary", MoneyCategoryKind.INCOME),
  cat("tenant-advance", MoneyCategoryKind.INCOME),
];

/** What the drawer's Category dropdown actually renders, for a given direction. */
const dropdownIds = (direction: "CREDIT" | "DEBIT") =>
  CATEGORIES.filter((c) => c.kind === categoryKindFor(direction)).map((c) => c.id);

test("a direction requires the matching category kind", () => {
  assert.equal(categoryKindFor("CREDIT"), MoneyCategoryKind.INCOME);
  assert.equal(categoryKindFor("DEBIT"), MoneyCategoryKind.EXPENSE);
});

test("seedable ids are exactly the ids the dropdown offers", () => {
  for (const direction of ["CREDIT", "DEBIT"] as const) {
    assert.deepEqual(
      categoryIdsFor(CATEGORIES, direction),
      dropdownIds(direction),
      `${direction} may only be seeded with a category its dropdown can show`
    );
  }
});

test("an income category is not seedable into a new (expense) entry", () => {
  // The regression: a last-used INCOME category passed a check against *every*
  // category, then rendered blank on the expense form the Add button opens.
  const seedable = categoryIdsFor(CATEGORIES, BLANK_ENTRY.direction);
  assert.ok(!seedable.includes("salary"));
  assert.ok(!seedable.includes("tenant-advance"));
  assert.deepEqual(seedable, ["groceries", "cement"]);
});

test("an empty category list yields nothing seedable rather than throwing", () => {
  assert.deepEqual(categoryIdsFor([], "DEBIT"), []);
});
