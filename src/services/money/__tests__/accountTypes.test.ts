// Account types: archive / reactivate, and what that means for accounts.
// Integration tests against the dev database (like money.scenarios.test.ts).
//
// Everything is created under a unique TAG and removed in after(), so the
// suite is self-cleaning and never touches real types or accounts.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import {
  createAccount,
  createAccountType,
  deleteAccountType,
  listAccountTypes,
  listAccountsWithBalances,
  resolveAccountType,
  updateAccount,
  updateAccountType,
} from "@/services/money";
import { selectableAccountByName } from "@/services/ai/writeTools/shared";
import { db } from "@/lib/db";

const TAG = `__ATTEST_${Date.now()}`;

after(async () => {
  const types = await db.accountType.findMany({
    where: { name: { startsWith: TAG } },
    select: { id: true },
  });
  await db.moneyAccount.deleteMany({ where: { name: { startsWith: TAG } } });
  await db.accountType.deleteMany({ where: { id: { in: types.map((t) => t.id) } } });
  await db.$disconnect();
});

test("a new type is active, carries its kind, and sorts after the existing ones", async () => {
  const t = await createAccountType({ name: `${TAG} bKash`, kind: "MOBILE_WALLET" });
  assert.equal(t.isActive, true);
  assert.equal(t.kind, "MOBILE_WALLET");
  const all = await listAccountTypes();
  const max = Math.max(...all.filter((x) => x.id !== t.id).map((x) => x.sortOrder));
  assert.ok(t.sortOrder > max);
});

test("type names are unique, ignoring case and surrounding space", async () => {
  await createAccountType({ name: `${TAG} Savings`, kind: "BANK" });
  await assert.rejects(
    createAccountType({ name: `  ${TAG} SAVINGS `, kind: "BANK" }),
    /already exists/
  );
  await assert.rejects(createAccountType({ name: "   ", kind: "BANK" }), /Name is required/);
});

test("an account takes the kind of its type", async () => {
  const t = await createAccountType({ name: `${TAG} Card`, kind: "CREDIT_CARD" });
  const a = await createAccount({ name: `${TAG} Visa`, accountTypeId: t.id, creditLimit: 5000 });
  assert.equal(a.type, "CREDIT_CARD");
  assert.equal(a.accountTypeId, t.id);
  // The credit limit only survives because the type's kind is a card.
  assert.equal(Number(a.creditLimit), 5000);
});

test("a type's kind can never change, so accounts can't drift from it", async () => {
  const t = await createAccountType({ name: `${TAG} Fixed`, kind: "CASH" });
  await assert.rejects(updateAccountType(t.id, { kind: "BANK" }), /can't be changed/);
  // Passing the same kind back is not a change.
  await updateAccountType(t.id, { kind: "CASH", name: `${TAG} Fixed 2` });
});

test("archiving hides the type's accounts from pickers; reactivating restores them", async () => {
  const t = await createAccountType({ name: `${TAG} Archive`, kind: "BANK" });
  const a = await createAccount({ name: `${TAG} Archived bank`, accountTypeId: t.id });

  await updateAccountType(t.id, { isActive: false });
  let row = (await listAccountsWithBalances()).find((x) => x.id === a.id)!;
  assert.equal(row.accountTypeActive, false, "the account reports its type as archived");
  assert.equal(row.isActive, true, "the account itself is untouched");

  await updateAccountType(t.id, { isActive: true });
  row = (await listAccountsWithBalances()).find((x) => x.id === a.id)!;
  assert.equal(row.accountTypeActive, true);
});

test("an archived type can't be given to a new or re-typed account", async () => {
  const t = await createAccountType({ name: `${TAG} Closed`, kind: "BANK" });
  await updateAccountType(t.id, { isActive: false });
  await assert.rejects(
    createAccount({ name: `${TAG} Nope`, accountTypeId: t.id }),
    /archived — reactivate it first/
  );

  const live = await createAccountType({ name: `${TAG} Live`, kind: "BANK" });
  const a = await createAccount({ name: `${TAG} Movable`, accountTypeId: live.id });
  await assert.rejects(updateAccount(a.id, { accountTypeId: t.id }), /archived/);
});

test("an account already under an archived type can still be edited", async () => {
  const t = await createAccountType({ name: `${TAG} Legacy`, kind: "CASH" });
  const a = await createAccount({ name: `${TAG} Old wallet`, accountTypeId: t.id });
  await updateAccountType(t.id, { isActive: false });
  // Same type passed back (as the edit form does) must not trip the archive check.
  const renamed = await updateAccount(a.id, { accountTypeId: t.id, name: `${TAG} Old wallet 2` });
  assert.equal(renamed.name, `${TAG} Old wallet 2`);
});

test("re-typing an account moves its kind with it", async () => {
  const cash = await createAccountType({ name: `${TAG} Re cash`, kind: "CASH" });
  const bank = await createAccountType({ name: `${TAG} Re bank`, kind: "BANK" });
  const a = await createAccount({ name: `${TAG} Retyped`, accountTypeId: cash.id });
  const moved = await updateAccount(a.id, { accountTypeId: bank.id });
  assert.equal(moved.accountTypeId, bank.id);
  assert.equal(moved.type, "BANK");
});

test("a bare kind resolves to an active type of that kind, never an archived one", async () => {
  const r = await resolveAccountType({ kind: "CASH" });
  const t = await db.accountType.findUnique({ where: { id: r.id } });
  assert.equal(t?.kind, "CASH");
  assert.equal(t?.isActive, true);
  await assert.rejects(resolveAccountType({}), /required/);
});

test("a type in use can't be deleted; an unused one can", async () => {
  const used = await createAccountType({ name: `${TAG} Used`, kind: "OTHER" });
  await createAccount({ name: `${TAG} User`, accountTypeId: used.id });
  const res = await deleteAccountType(used.id);
  assert.equal(res.deleted, false);

  const unused = await createAccountType({ name: `${TAG} Unused`, kind: "OTHER" });
  assert.equal((await deleteAccountType(unused.id)).deleted, true);
});

test("the assistant can't post to an account under an archived type", async () => {
  const t = await createAccountType({ name: `${TAG} AI hidden`, kind: "BANK" });
  await createAccount({ name: `${TAG} AI bank`, accountTypeId: t.id });
  assert.ok(await selectableAccountByName(`${TAG} AI bank`));

  await updateAccountType(t.id, { isActive: false });
  await assert.rejects(selectableAccountByName(`${TAG} AI bank`), /archived type/);
});
