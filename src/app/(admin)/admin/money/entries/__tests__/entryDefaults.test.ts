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
import {
  BLANK_ENTRY,
  BLANK_TRANSFER,
  categoryIdsFor,
  categoryKindFor,
  swapTransferDirection,
} from "../types";

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

// ─── Transfer direction swap ────────────────────────────────────────────────

test("swapping a same-currency transfer exchanges the accounts and leaves the amount", () => {
  const swapped = swapTransferDirection({
    ...BLANK_TRANSFER,
    fromAccountId: "bank",
    toAccountId: "cash",
    amount: "5000",
  });
  assert.equal(swapped.fromAccountId, "cash");
  assert.equal(swapped.toAccountId, "bank");
  assert.equal(swapped.amount, "5000"); // blanking the required field would be worse
  assert.equal(swapped.toAmount, "");
});

test("swapping a cross-currency transfer carries the paired amounts with it", () => {
  // The amounts are positional: `amount` is source currency, `toAmount` is
  // destination. Moving the accounts without them would leave 10000 reading as
  // MYR — the inverse transfer is 380 MYR out, 10000 BDT in.
  const swapped = swapTransferDirection({
    ...BLANK_TRANSFER,
    fromAccountId: "bdt-bank",
    toAccountId: "myr-wallet",
    amount: "10000",
    toAmount: "380",
  });
  assert.equal(swapped.fromAccountId, "myr-wallet");
  assert.equal(swapped.toAccountId, "bdt-bank");
  assert.equal(swapped.amount, "380");
  assert.equal(swapped.toAmount, "10000");
});

test("swapping twice returns the original form", () => {
  const original = {
    ...BLANK_TRANSFER,
    fromAccountId: "bdt-bank",
    toAccountId: "myr-wallet",
    amount: "10000",
    toAmount: "380",
    fee: "25",
    description: "wallet top-up",
  };
  assert.deepEqual(swapTransferDirection(swapTransferDirection(original)), original);
});

test("swapping with only one side chosen moves it across", () => {
  // The common case for the button: the account was picked on the wrong side.
  const swapped = swapTransferDirection({ ...BLANK_TRANSFER, fromAccountId: "cash" });
  assert.equal(swapped.fromAccountId, "");
  assert.equal(swapped.toAccountId, "cash");
});
