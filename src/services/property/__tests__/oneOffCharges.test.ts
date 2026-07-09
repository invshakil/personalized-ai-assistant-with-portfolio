// One-off charge service tests. node:test via tsx, dev DB, self-cleaning.
//
// Run: npm test  (or: node --import tsx --test src/services/property/__tests__/oneOffCharges.test.ts)
//
// Strategy:
//  - Create a tagged Unit + Tenant in before(); purge everything we create in
//    after() so a developer's local data is never disturbed.
//  - All rows we touch carry the tag (unit number / tenant code / name) so the
//    cleanup filters can find them even after a crashed run.
//  - Charges are billed against a far-future year (2099) to avoid colliding
//    with any real payment rows and to keep carry-forward at zero.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import {
  computeRentDue,
  createOneOffCharge,
  updateOneOffCharge,
  deleteOneOffCharge,
  getOneOffCharges,
  generatePayments,
} from "@/services/property";

const TAG = `__ooctest_${Date.now()}`;
const YEAR = 2099;
const MONTH = 6;
const BASE_RENT = 10000;

let unitId = "";
let tenantId = "";

async function purge() {
  const tenants = await db.tenant.findMany({
    where: { name: { startsWith: "__ooctest_" } },
    select: { id: true },
  });
  const tenantIds = tenants.map((t) => t.id);
  if (tenantIds.length) {
    const payments = await db.payment.findMany({
      where: { tenantId: { in: tenantIds } },
      select: { id: true },
    });
    const paymentIds = payments.map((p) => p.id);
    if (paymentIds.length)
      await db.paymentTransaction.deleteMany({ where: { paymentId: { in: paymentIds } } });
    await db.payment.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.oneOffCharge.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
  await db.unit.deleteMany({ where: { unitNumber: { startsWith: "__ooctest_" } } });
}

before(async () => {
  await purge();
  const unit = await db.unit.create({
    data: { unitNumber: `${TAG}_U`, floor: "Test Floor", monthlyRent: BASE_RENT },
  });
  unitId = unit.id;
  const tenant = await db.tenant.create({
    data: {
      name: `${TAG}_tenant`,
      tenantCode: `${TAG}_T`,
      moveInDate: new Date(YEAR - 1, 0, 1),
      isActive: true,
      tenantStatus: "CURRENT",
      unitId,
    },
  });
  tenantId = tenant.id;
});

after(async () => {
  await purge();
  await db.$disconnect();
});

// ─── Pure bill-total helper ──────────────────────────────────────────────────

test("computeRentDue: sums base + services + one-off + carry-forward", () => {
  assert.equal(
    computeRentDue({ baseRent: 10000, serviceTotal: 1500, oneOffTotal: 2000, carryForward: 500 }),
    14000
  );
});

test("computeRentDue: zero one-off leaves the total unchanged", () => {
  assert.equal(
    computeRentDue({ baseRent: 10000, serviceTotal: 0, oneOffTotal: 0, carryForward: 0 }),
    10000
  );
});

// ─── Validation ──────────────────────────────────────────────────────────────

test("createOneOffCharge: rejects non-positive amount", async () => {
  await assert.rejects(
    () => createOneOffCharge({ tenantId, label: "Bad", amount: 0, month: MONTH, year: YEAR }),
    /greater than zero/
  );
});

test("createOneOffCharge: rejects empty label", async () => {
  await assert.rejects(
    () => createOneOffCharge({ tenantId, label: "  ", amount: 100, month: MONTH, year: YEAR }),
    /label is required/
  );
});

test("createOneOffCharge: rejects unknown tenant", async () => {
  await assert.rejects(
    () =>
      createOneOffCharge({ tenantId: "nope", label: "X", amount: 100, month: MONTH, year: YEAR }),
    /Tenant not found/
  );
});

test("createOneOffCharge: rejects out-of-range month", async () => {
  await assert.rejects(
    () => createOneOffCharge({ tenantId, label: "X", amount: 100, month: 13, year: YEAR }),
    /Month must be between 1 and 12/
  );
});

// ─── CRUD + list ───────────────────────────────────────────────────────────

test("createOneOffCharge + getOneOffCharges: stored and returned", async () => {
  const created = await createOneOffCharge({
    tenantId,
    label: "Maintenance fee",
    amount: 2000,
    month: MONTH,
    year: YEAR,
    notes: "AC servicing",
  });
  assert.equal(created.amount, 2000);
  assert.equal(created.label, "Maintenance fee");

  const list = await getOneOffCharges({ tenantId, month: MONTH, year: YEAR });
  assert.equal(list.length, 1);
  assert.equal(list[0].amount, 2000);
  assert.equal(list[0].notes, "AC servicing");

  await deleteOneOffCharge(created.id);
  const after = await getOneOffCharges({ tenantId, month: MONTH, year: YEAR });
  assert.equal(after.length, 0);
});

// ─── Payment sync (delta) ────────────────────────────────────────────────────

test("charge add/update/delete keeps an existing bill in step", async () => {
  // A fully-paid rent row for the period: rentDue == baseRent, amountPaid == baseRent.
  const payment = await db.payment.create({
    data: {
      tenantId,
      unitId,
      month: MONTH,
      year: YEAR,
      rentDue: BASE_RENT,
      amountPaid: BASE_RENT,
      advanceApplied: 0,
      carryForward: 0,
      status: "PAID",
    },
  });

  // Adding a 2000 charge lifts the total due and flips PAID → PARTIAL.
  const charge = await createOneOffCharge({
    tenantId,
    label: "Plumbing repair",
    amount: 2000,
    month: MONTH,
    year: YEAR,
  });
  let row = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal(Number(row.rentDue), BASE_RENT + 2000);
  assert.equal(row.status, "PARTIAL");

  // Editing the amount adjusts by the delta (2000 → 3000 ⇒ +1000).
  await updateOneOffCharge(charge.id, { amount: 3000 });
  row = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal(Number(row.rentDue), BASE_RENT + 3000);
  assert.equal(row.status, "PARTIAL");

  // Removing it restores the original total and the PAID status.
  await deleteOneOffCharge(charge.id);
  row = await db.payment.findUniqueOrThrow({ where: { id: payment.id } });
  assert.equal(Number(row.rentDue), BASE_RENT);
  assert.equal(row.status, "PAID");

  await db.payment.delete({ where: { id: payment.id } });
});

test("charge before generation is folded into rentDue by generatePayments", async () => {
  // No payment row yet — the charge is stored and picked up at generation.
  await createOneOffCharge({
    tenantId,
    label: "Gate motor repair",
    amount: 2500,
    month: MONTH,
    year: YEAR,
  });

  await generatePayments(MONTH, YEAR);

  const row = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  assert.ok(row, "a payment row was generated");
  // base rent + one-off charge (no services, no carry-forward).
  assert.equal(Number(row!.rentDue), BASE_RENT + 2500);

  // Regeneration is idempotent for the total (still base + charge).
  await generatePayments(MONTH, YEAR);
  const again = await db.payment.findUniqueOrThrow({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  assert.equal(Number(again.rentDue), BASE_RENT + 2500);
});
