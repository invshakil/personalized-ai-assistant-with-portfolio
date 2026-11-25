// Tenant advance ↔ Money-Manager posting. node:test via tsx, dev DB, self-cleaning.
//
// Run: node --import tsx --test src/services/property/__tests__/tenantAdvance.test.ts
//
// Advances are often paid in instalments: part at move-in, the rest with a later
// rent. Creating the tenant posts the first part; each later edit posts only the
// DIFFERENCE from the advance held before, and only when an account is given.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { createTenant, updateTenant, advanceDelta } from "@/services/property";
import { createAccount, getAccountBalance } from "@/services/money";

const TAG = `__advtest_${Date.now()}`;

let accountId = "";

async function purge() {
  const tenants = await db.tenant.findMany({
    where: { name: { startsWith: "__advtest_" } },
    select: { id: true },
  });
  const tenantIds = tenants.map((t) => t.id);
  // A leftover test tenant can have had rent rows generated for it (the payments
  // page creates them on view) — those block the tenant delete, so they go first.
  await db.payment.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  const accts = await db.moneyAccount.findMany({
    where: { name: { startsWith: "__advtest_" } },
    select: { id: true },
  });
  await db.moneyEntry.deleteMany({ where: { accountId: { in: accts.map((a) => a.id) } } });
  await db.moneyAccount.deleteMany({ where: { id: { in: accts.map((a) => a.id) } } });
}

before(async () => {
  await purge();
  const a = await createAccount({ name: `${TAG} Bank`, type: "BANK", openingBalance: 0 });
  accountId = a.id;
});

after(async () => {
  await purge();
  await db.$disconnect();
});

test("advanceDelta: only a paid advance counts, and the flag toggles the whole amount", () => {
  assert.equal(
    advanceDelta(
      { advancePaid: true, advanceAmount: 5000 },
      { advancePaid: true, advanceAmount: 10000 }
    ),
    5000
  );
  assert.equal(
    advanceDelta(
      { advancePaid: true, advanceAmount: 10000 },
      { advancePaid: true, advanceAmount: 8000 }
    ),
    -2000
  );
  assert.equal(
    advanceDelta(
      { advancePaid: false, advanceAmount: 0 },
      { advancePaid: true, advanceAmount: 5000 }
    ),
    5000
  );
  assert.equal(
    advanceDelta(
      { advancePaid: true, advanceAmount: 5000 },
      { advancePaid: false, advanceAmount: 5000 }
    ),
    -5000
  );
  assert.equal(
    advanceDelta(
      { advancePaid: true, advanceAmount: { toNumber: () => 5000 } },
      { advancePaid: true, advanceAmount: 5000 }
    ),
    0
  );
});

test("editing the advance posts only the difference to the chosen account", async () => {
  const t = (await createTenant({
    name: `${TAG} tenant`,
    isExternal: true,
    moveInDate: "2098-01-01",
    advancePaid: true,
    advanceAmount: 5000,
    advanceAccountId: accountId,
  })) as unknown as { id: string };
  assert.equal(await getAccountBalance(accountId), 5000, "the first instalment lands at create");

  // Second instalment: the tenant now holds 10,000 in total → +5,000 posted.
  await updateTenant(t.id, {
    advancePaid: true,
    advanceAmount: 10000,
    advanceAccountId: accountId,
  });
  assert.equal(await getAccountBalance(accountId), 10000);
  const topUp = await db.moneyEntry.findFirst({
    where: { accountId, description: { contains: "top-up" } },
    include: { category: true },
  });
  assert.ok(topUp, "a top-up credit was posted");
  assert.equal(topUp!.direction, "CREDIT");
  assert.equal(Number(topUp!.amount), 5000);
  assert.equal(topUp!.category?.name, "Tenant Advance");

  // Same amount again → nothing posted (no duplicate credit).
  await updateTenant(t.id, {
    advancePaid: true,
    advanceAmount: 10000,
    advanceAccountId: accountId,
  });
  assert.equal(await getAccountBalance(accountId), 10000);
  assert.equal(await db.moneyEntry.count({ where: { accountId } }), 2);

  // Without an account the ledger is untouched even though the advance changed.
  await updateTenant(t.id, { advancePaid: true, advanceAmount: 12000 });
  assert.equal(await getAccountBalance(accountId), 10000);
  assert.equal(await db.moneyEntry.count({ where: { accountId } }), 2);

  // A decrease with an account is a refund DEBIT.
  const updated = await updateTenant(t.id, {
    advancePaid: true,
    advanceAmount: 9000,
    advanceAccountId: accountId,
  });
  assert.equal(updated.advanceAmount, 9000);
  assert.equal(await getAccountBalance(accountId), 7000);
  const refund = await db.moneyEntry.findFirst({
    where: { accountId, direction: "DEBIT" },
    include: { category: true },
  });
  assert.equal(Number(refund!.amount), 3000);
  assert.equal(refund!.category?.name, "Tenant Advance Refund");
});
