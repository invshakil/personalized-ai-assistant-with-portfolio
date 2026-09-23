// The "Account type → Account" picker rules. No DB, no network — `npm run test`.
//
// Every account picker in the admin renders from these functions, so these are
// the tests for "only active account types can be selected throughout the
// project" and for the type/account pair never contradicting itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isSelectable,
  pairFields,
  pairValidValues,
  rememberAccountPair,
  seedAccountPair,
  seedSelection,
  selectAccount,
  selectableAccounts,
  selectableIds,
  selectableTypes,
  selectType,
  typeOfAccount,
  withKindFallback,
  type PickerAccount,
} from "../accountPicker";

const acct = (id: string, typeId: string, extra: Partial<PickerAccount> = {}): PickerAccount => ({
  id,
  name: id,
  type: typeId === "cash" ? "CASH" : typeId === "card" ? "CREDIT_CARD" : "BANK",
  currency: "BDT",
  isActive: true,
  accountTypeId: typeId,
  accountTypeName: typeId.toUpperCase(),
  accountTypeActive: true,
  accountTypeSortOrder: { cash: 1, bank: 2, bkash: 3, card: 4, old: 9 }[typeId] ?? 5,
  ...extra,
});

const ACCOUNTS: PickerAccount[] = [
  acct("wallet", "cash"),
  acct("city", "bank"),
  acct("brac", "bank"),
  acct("usd", "bank", { currency: "USD" }),
  acct("bkash", "bkash"),
  acct("closed", "bank", { isActive: false }), // deactivated account
  acct("legacy", "old", { accountTypeActive: false }), // account under an archived type
];

const ids = (rows: { id: string }[]) => rows.map((r) => r.id);

// ─── what is selectable ─────────────────────────────────────────────────────

test("an account is selectable only when it and its type are both active", () => {
  assert.equal(isSelectable(acct("a", "cash")), true);
  assert.equal(isSelectable(acct("a", "cash", { isActive: false })), false);
  assert.equal(isSelectable(acct("a", "cash", { accountTypeActive: false })), false);
});

test("with no type chosen, every selectable account is offered", () => {
  assert.deepEqual(ids(selectableAccounts(ACCOUNTS, "")), [
    "wallet",
    "city",
    "brac",
    "usd",
    "bkash",
  ]);
});

test("choosing a type narrows the accounts to that type", () => {
  assert.deepEqual(ids(selectableAccounts(ACCOUNTS, "bank")), ["city", "brac", "usd"]);
  assert.deepEqual(ids(selectableAccounts(ACCOUNTS, "cash")), ["wallet"]);
});

test("accounts under an archived type are never offered, even when filtering by it", () => {
  assert.deepEqual(ids(selectableAccounts(ACCOUNTS, "old")), []);
});

test("a form filter narrows on top of the active rules", () => {
  const bdtOnly = (a: PickerAccount) => a.currency === "BDT";
  assert.deepEqual(ids(selectableAccounts(ACCOUNTS, "bank", { filter: bdtOnly })), [
    "city",
    "brac",
  ]);
});

test("the value a record already holds stays visible after its account is archived", () => {
  assert.deepEqual(ids(selectableAccounts(ACCOUNTS, "", { keepId: "legacy" })), [
    "wallet",
    "city",
    "brac",
    "usd",
    "bkash",
    "legacy",
  ]);
  assert.ok(ids(selectableAccounts(ACCOUNTS, "", { keepId: "closed" })).includes("closed"));
});

test("keeping a value does not bypass the form's own filter", () => {
  const bdtOnly = (a: PickerAccount) => a.currency === "BDT";
  assert.ok(
    !ids(selectableAccounts(ACCOUNTS, "", { keepId: "usd", filter: bdtOnly })).includes("usd")
  );
});

// ─── the type list ───────────────────────────────────────────────────────────

test("the type filter lists only active types that have something to pick, in sort order", () => {
  assert.deepEqual(selectableTypes(ACCOUNTS), [
    { id: "cash", name: "CASH" },
    { id: "bank", name: "BANK" },
    { id: "bkash", name: "BKASH" },
  ]);
});

test("a type whose accounts are all filtered out is not offered", () => {
  const usdOnly = (a: PickerAccount) => a.currency === "USD";
  assert.deepEqual(selectableTypes(ACCOUNTS, { filter: usdOnly }), [{ id: "bank", name: "BANK" }]);
});

test("an archived type reappears only to show a record's existing account", () => {
  assert.ok(!selectableTypes(ACCOUNTS).some((t) => t.id === "old"));
  assert.ok(selectableTypes(ACCOUNTS, { keepId: "legacy" }).some((t) => t.id === "old"));
});

// ─── keeping the pair consistent ─────────────────────────────────────────────

test("picking an account snaps the type to that account's type", () => {
  assert.deepEqual(selectAccount(ACCOUNTS, "bkash", ""), { typeId: "bkash", accountId: "bkash" });
  assert.deepEqual(selectAccount(ACCOUNTS, "city", "cash"), { typeId: "bank", accountId: "city" });
});

test("clearing the account keeps the chosen type", () => {
  assert.deepEqual(selectAccount(ACCOUNTS, "", "bank"), { typeId: "bank", accountId: "" });
});

test("changing type keeps the account only if it belongs to the new type", () => {
  assert.deepEqual(selectType(ACCOUNTS, { typeId: "", accountId: "city" }, "bank"), {
    typeId: "bank",
    accountId: "city",
  });
  assert.deepEqual(selectType(ACCOUNTS, { typeId: "bank", accountId: "city" }, "cash"), {
    typeId: "cash",
    accountId: "",
  });
});

test("switching to 'All types' never clears the account", () => {
  assert.deepEqual(selectType(ACCOUNTS, { typeId: "bank", accountId: "city" }, ""), {
    typeId: "",
    accountId: "city",
  });
});

// ─── seeding a new record from Settings → Defaults ──────────────────────────

test("a default account seeds both halves", () => {
  assert.deepEqual(seedSelection(ACCOUNTS, { accountId: "brac" }), {
    typeId: "bank",
    accountId: "brac",
  });
});

test("a default type alone seeds just the filter", () => {
  assert.deepEqual(seedSelection(ACCOUNTS, { typeId: "bank" }), { typeId: "bank", accountId: "" });
});

test("when the default account and default type disagree, the account wins", () => {
  assert.deepEqual(seedSelection(ACCOUNTS, { typeId: "bank", accountId: "wallet" }), {
    typeId: "cash",
    accountId: "wallet",
  });
});

test("stale defaults degrade to empty rather than seeding an unselectable value", () => {
  assert.deepEqual(seedSelection(ACCOUNTS, { accountId: "closed" }), { typeId: "", accountId: "" });
  assert.deepEqual(seedSelection(ACCOUNTS, { accountId: "legacy" }), { typeId: "", accountId: "" });
  assert.deepEqual(seedSelection(ACCOUNTS, { typeId: "old" }), { typeId: "", accountId: "" });
  assert.deepEqual(seedSelection(ACCOUNTS, { accountId: "gone" }), { typeId: "", accountId: "" });
});

test("a default the form's filter rules out is not seeded", () => {
  const bdtOnly = (a: PickerAccount) => a.currency === "BDT";
  assert.deepEqual(seedSelection(ACCOUNTS, { accountId: "usd" }, bdtOnly), {
    typeId: "",
    accountId: "",
  });
});

test("a stale account falls back to a still-valid default type", () => {
  assert.deepEqual(seedSelection(ACCOUNTS, { typeId: "bank", accountId: "closed" }), {
    typeId: "bank",
    accountId: "",
  });
});

test("selectableIds lists exactly what may be seeded", () => {
  const r = selectableIds(ACCOUNTS);
  assert.deepEqual(r.accountIds, ["wallet", "city", "brac", "usd", "bkash"]);
  assert.deepEqual(r.typeIds, ["cash", "bank", "bkash"]);
});

// ─── opening an existing record ──────────────────────────────────────────────

test("an existing record opens with its account's type", () => {
  assert.equal(typeOfAccount(ACCOUNTS, "city"), "bank");
  assert.equal(typeOfAccount(ACCOUNTS, "legacy"), "old");
  assert.equal(typeOfAccount(ACCOUNTS, null), "");
  assert.equal(typeOfAccount(ACCOUNTS, "gone"), "");
});

// ─── form-defaults plumbing ──────────────────────────────────────────────────

test("pair field names follow the registry, with and without a prefix", () => {
  assert.deepEqual(pairFields(), { type: "accountTypeId", account: "accountId" });
  assert.deepEqual(pairFields("from"), { type: "fromAccountTypeId", account: "fromAccountId" });
});

test("pairValidValues keys the selectable ids by the prefixed field names", () => {
  assert.deepEqual(pairValidValues(ACCOUNTS, { prefix: "to" }), {
    toAccountTypeId: ["cash", "bank", "bkash"],
    toAccountId: ["wallet", "city", "brac", "usd", "bkash"],
  });
});

test("seedAccountPair reads the prefixed fields and reconciles them", () => {
  assert.deepEqual(
    seedAccountPair(
      ACCOUNTS,
      { fromAccountTypeId: "bank", fromAccountId: "wallet" },
      { prefix: "from" }
    ),
    { typeId: "cash", accountId: "wallet" }
  );
  assert.deepEqual(seedAccountPair(ACCOUNTS, {}), { typeId: "", accountId: "" });
});

test("rememberAccountPair writes both halves under the prefixed names", () => {
  assert.deepEqual(rememberAccountPair({ typeId: "bank", accountId: "city" }, "to"), {
    toAccountTypeId: "bank",
    toAccountId: "city",
  });
});

// ─── legacy auto-pick ────────────────────────────────────────────────────────

test("with nothing stored, a form falls back to the first selectable account of its kind", () => {
  const none = { typeId: "", accountId: "" };
  assert.deepEqual(withKindFallback(ACCOUNTS, none, "CASH"), {
    typeId: "cash",
    accountId: "wallet",
  });
  assert.deepEqual(withKindFallback(ACCOUNTS, none, "BANK"), { typeId: "bank", accountId: "city" });
});

test("the fallback never picks an unselectable account", () => {
  const onlyArchived = [
    acct("closed", "bank", { isActive: false }),
    acct("x", "old", { accountTypeActive: false }),
  ];
  assert.deepEqual(withKindFallback(onlyArchived, { typeId: "", accountId: "" }, "BANK"), {
    typeId: "",
    accountId: "",
  });
});

test("a stored default — even just a type — beats the fallback", () => {
  assert.deepEqual(withKindFallback(ACCOUNTS, { typeId: "bkash", accountId: "" }, "CASH"), {
    typeId: "bkash",
    accountId: "",
  });
  assert.deepEqual(withKindFallback(ACCOUNTS, { typeId: "bank", accountId: "brac" }, "CASH"), {
    typeId: "bank",
    accountId: "brac",
  });
});

test("no kind means no fallback", () => {
  assert.deepEqual(withKindFallback(ACCOUNTS, { typeId: "", accountId: "" }, null), {
    typeId: "",
    accountId: "",
  });
});
