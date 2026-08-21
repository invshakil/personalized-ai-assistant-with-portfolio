// Voucher service tests. node:test via tsx, dev DB, self-cleaning.
//
// Run: npm test  (or: node --import tsx --test src/services/property/__tests__/vouchers.test.ts)
//
// Mirrors oneOffCharges.test.ts: a tagged Unit + Tenant created in before() and
// purged in after(), billed against a far-future year so no real payment row is
// touched and carry-forward stays at zero.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import {
  computeRentDue,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  getVouchers,
  createOneOffCharge,
  updateOneOffCharge,
  deleteOneOffCharge,
  generatePayments,
} from "@/services/property";

const TAG = `__vouchertest_${Date.now()}`;
const YEAR = 2098;
const MONTH = 6;
const BASE_RENT = 10000;

let unitId = "";
let tenantId = "";

async function purge() {
  const tenants = await db.tenant.findMany({
    where: { name: { startsWith: "__vouchertest_" } },
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
    await db.voucher.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.oneOffCharge.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await db.tenant.deleteMany({ where: { id: { in: tenantIds } } });
  }
  await db.unit.deleteMany({ where: { unitNumber: { startsWith: "__vouchertest_" } } });
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

test("computeRentDue: a voucher is subtracted from the bill", () => {
  assert.equal(
    computeRentDue({
      baseRent: 10000,
      serviceTotal: 1500,
      oneOffTotal: 2000,
      carryForward: 500,
      voucherTotal: 2000,
    }),
    12000
  );
});

test("computeRentDue: omitting voucherTotal is unchanged from before", () => {
  assert.equal(
    computeRentDue({ baseRent: 10000, serviceTotal: 1500, oneOffTotal: 2000, carryForward: 500 }),
    14000
  );
});

test("computeRentDue: a voucher larger than the bill floors it at zero, never negative", () => {
  assert.equal(
    computeRentDue({
      baseRent: 10000,
      serviceTotal: 0,
      oneOffTotal: 0,
      carryForward: 0,
      voucherTotal: 25000,
    }),
    0
  );
});

// ─── Validation ──────────────────────────────────────────────────────────────

test("createVoucher: rejects non-positive and non-finite amounts", async () => {
  await assert.rejects(
    () => createVoucher({ tenantId, label: "Bad", amount: 0, month: MONTH, year: YEAR }),
    /greater than zero/
  );
  await assert.rejects(
    () => createVoucher({ tenantId, label: "Bad", amount: -50, month: MONTH, year: YEAR }),
    /greater than zero/
  );
  await assert.rejects(
    () => createVoucher({ tenantId, label: "Bad", amount: NaN, month: MONTH, year: YEAR }),
    /greater than zero/
  );
});

test("createVoucher: rejects a blank label and an out-of-range month", async () => {
  await assert.rejects(
    () => createVoucher({ tenantId, label: "   ", amount: 100, month: MONTH, year: YEAR }),
    /label is required/
  );
  await assert.rejects(
    () => createVoucher({ tenantId, label: "X", amount: 100, month: 13, year: YEAR }),
    /between 1 and 12/
  );
});

// ─── Bill adjustment against a generated payment ─────────────────────────────

test("a voucher reduces an already-generated bill and reopens a paid one", async () => {
  await generatePayments(MONTH, YEAR);
  const before = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  assert.ok(before, "bill generated");
  assert.equal(Number(before!.rentDue), BASE_RENT);

  const v = await createVoucher({
    tenantId,
    label: "Maintenance paid by tenant",
    amount: 2500,
    month: MONTH,
    year: YEAR,
  });
  const afterIssue = await db.payment.findUnique({ where: { id: before!.id } });
  assert.equal(Number(afterIssue!.rentDue), BASE_RENT - 2500, "bill drops by the voucher");

  // Raising the voucher reduces the bill further; lowering it gives value back.
  await updateVoucher(v.id, { amount: 4000 });
  const afterRaise = await db.payment.findUnique({ where: { id: before!.id } });
  assert.equal(Number(afterRaise!.rentDue), BASE_RENT - 4000);

  await updateVoucher(v.id, { amount: 1000 });
  const afterLower = await db.payment.findUnique({ where: { id: before!.id } });
  assert.equal(Number(afterLower!.rentDue), BASE_RENT - 1000);

  // Removing it restores the original bill exactly.
  await deleteVoucher(v.id);
  const afterDelete = await db.payment.findUnique({ where: { id: before!.id } });
  assert.equal(Number(afterDelete!.rentDue), BASE_RENT, "delete is a clean round-trip");
});

test("a voucher settles the bill and marks the payment PAID", async () => {
  const payment = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  await db.payment.update({
    where: { id: payment!.id },
    data: { amountPaid: BASE_RENT - 1500, status: "PARTIAL" },
  });

  const v = await createVoucher({
    tenantId,
    label: "Goodwill discount",
    amount: 1500,
    month: MONTH,
    year: YEAR,
  });
  const settled = await db.payment.findUnique({ where: { id: payment!.id } });
  assert.equal(Number(settled!.rentDue), BASE_RENT - 1500);
  assert.equal(settled!.status, "PAID", "covering the remainder flips the status to PAID");

  await deleteVoucher(v.id);
  const reopened = await db.payment.findUnique({ where: { id: payment!.id } });
  assert.equal(reopened!.status, "PARTIAL", "removing the credit reopens the balance");
  await db.payment.update({
    where: { id: payment!.id },
    data: { amountPaid: 0, status: "PENDING" },
  });
});

test("a voucher larger than the bill is rejected, not silently clamped", async () => {
  // Clamping rentDue at 0 would be lossy: deleting the voucher afterwards would
  // restore more than it took off. The cap keeps every mutation reversible.
  await assert.rejects(
    () =>
      createVoucher({
        tenantId,
        label: "Oversized credit",
        amount: BASE_RENT * 3,
        month: MONTH,
        year: YEAR,
      }),
    /exceeds the bill/
  );

  // A voucher for exactly the bill is allowed and zeroes it.
  const exact = await createVoucher({
    tenantId,
    label: "Full waiver",
    amount: BASE_RENT,
    month: MONTH,
    year: YEAR,
  });
  const zeroed = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  assert.equal(Number(zeroed!.rentDue), 0);

  // With the bill at zero there is no room for a second voucher.
  await assert.rejects(
    () => createVoucher({ tenantId, label: "Extra", amount: 1, month: MONTH, year: YEAR }),
    /exceeds the bill/
  );

  await deleteVoucher(exact.id);
  const restored = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  assert.equal(Number(restored!.rentDue), BASE_RENT, "removing the waiver restores the exact bill");
});

test("editing a voucher may grow it into its own headroom but no further", async () => {
  const v = await createVoucher({
    tenantId,
    label: "Adjustable",
    amount: 1000,
    month: MONTH,
    year: YEAR,
  });
  // Growing to the full bill is fine — the old 1,000 is given back first.
  await updateVoucher(v.id, { amount: BASE_RENT });
  const maxed = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  assert.equal(Number(maxed!.rentDue), 0);

  await assert.rejects(() => updateVoucher(v.id, { amount: BASE_RENT + 1 }), /exceeds the bill/);

  await deleteVoucher(v.id);
  const restored = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: MONTH, year: YEAR } },
  });
  assert.equal(Number(restored!.rentDue), BASE_RENT);
});

test("generatePayments nets charges against vouchers for a fresh month", async () => {
  const month = 7;
  await createOneOffCharge({ tenantId, label: "Repair", amount: 3000, month, year: YEAR });
  await createVoucher({ tenantId, label: "Reimbursement", amount: 1200, month, year: YEAR });

  await generatePayments(month, YEAR);
  const bill = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month, year: YEAR } },
  });
  assert.ok(bill, "bill generated");
  // Month 6 was left unpaid by the tests above, so it carries forward in full.
  const carried = Number(bill!.carryForward);
  assert.equal(carried, BASE_RENT, "previous month carried forward");
  assert.equal(
    Number(bill!.rentDue),
    BASE_RENT + 3000 + carried - 1200,
    "base + charge + carry-forward, less the voucher"
  );
});

// ─── Regressions: the cap must hold on every path into a bill ────────────────
// Each case uses a month whose predecessor was never generated, so carry-forward
// is 0 and the arithmetic is unambiguous.

test("a voucher raised BEFORE the bill exists is still capped, and round-trips", async () => {
  // Without a cap here the voucher skipped validation, generatePayments floored
  // rentDue at 0, and deleting it added the full amount back — a 10,000 bill
  // came back as 20,000.
  await assert.rejects(
    () =>
      createVoucher({
        tenantId,
        label: "Oversized pre-generation",
        amount: BASE_RENT * 2,
        month: 3,
        year: YEAR,
      }),
    /exceeds the bill/
  );

  const v = await createVoucher({
    tenantId,
    label: "Valid pre-generation",
    amount: 4000,
    month: 3,
    year: YEAR,
  });
  await generatePayments(3, YEAR);
  const generated = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: 3, year: YEAR } },
  });
  assert.equal(Number(generated!.rentDue), BASE_RENT - 4000, "voucher folded in at generation");

  await deleteVoucher(v.id);
  const restored = await db.payment.findUnique({ where: { id: generated!.id } });
  assert.equal(Number(restored!.rentDue), BASE_RENT, "delete restores the exact bill");
});

test("a charge cannot be reduced below the vouchers credited against the month", async () => {
  await generatePayments(9, YEAR);
  const charge = await createOneOffCharge({
    tenantId,
    label: "Repair",
    amount: 3000,
    month: 9,
    year: YEAR,
  });
  const waiver = await createVoucher({
    tenantId,
    label: "Full waiver",
    amount: BASE_RENT + 3000,
    month: 9,
    year: YEAR,
  });
  const zeroed = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: 9, year: YEAR } },
  });
  assert.equal(Number(zeroed!.rentDue), 0);

  await assert.rejects(() => deleteOneOffCharge(charge.id), /below the vouchers/);
  await assert.rejects(() => updateOneOffCharge(charge.id, { amount: 500 }), /below the vouchers/);

  // The rejection must leave the charge row intact — the guard runs before the
  // write, since the row delete and the bill update are not in one transaction.
  const survived = await db.oneOffCharge.findUnique({ where: { id: charge.id } });
  assert.ok(survived, "charge row survives a rejected delete");
  const unchanged = await db.payment.findUnique({ where: { id: zeroed!.id } });
  assert.equal(Number(unchanged!.rentDue), 0, "bill untouched by the rejected delete");

  // Unwound in the right order, every step is exact.
  await deleteVoucher(waiver.id);
  const afterWaiver = await db.payment.findUnique({ where: { id: zeroed!.id } });
  assert.equal(Number(afterWaiver!.rentDue), BASE_RENT + 3000);
  await deleteOneOffCharge(charge.id);
  const afterCharge = await db.payment.findUnique({ where: { id: zeroed!.id } });
  assert.equal(Number(afterCharge!.rentDue), BASE_RENT);
});

test("a voucher cannot exceed what is still owed, so credit is never swallowed", async () => {
  await generatePayments(11, YEAR);
  const payment = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: 11, year: YEAR } },
  });
  await db.payment.update({
    where: { id: payment!.id },
    data: { amountPaid: BASE_RENT, status: "PAID" },
  });

  // Crediting a settled month would push rentDue under amountPaid; that
  // overpayment is dropped by carryForward's own max(0, …), so refuse it.
  await assert.rejects(
    () => createVoucher({ tenantId, label: "Late", amount: 2500, month: 11, year: YEAR }),
    /already settled/
  );

  await db.payment.update({
    where: { id: payment!.id },
    data: { amountPaid: 6000, status: "PARTIAL" },
  });
  await assert.rejects(
    () => createVoucher({ tenantId, label: "Too big", amount: 5000, month: 11, year: YEAR }),
    /exceeds the bill/
  );

  await createVoucher({ tenantId, label: "Exact", amount: 4000, month: 11, year: YEAR });
  const settled = await db.payment.findUnique({ where: { id: payment!.id } });
  assert.equal(Number(settled!.rentDue), 6000);
  assert.equal(settled!.status, "PAID", "credit exactly settles the month, nothing lost");
});

test("a voucher moves Expected, never Collected", async () => {
  // The summary strip reports Collected as cash actually received. A voucher is
  // a credit on the bill, not money in hand, so it must only ever move rentDue.
  await generatePayments(2, YEAR);
  const key = { tenantId_month_year: { tenantId, month: 2, year: YEAR } };
  const before = await db.payment.findUnique({ where: key });
  await db.payment.update({
    where: { id: before!.id },
    data: { amountPaid: 4000, status: "PARTIAL" },
  });

  const v = await createVoucher({
    tenantId,
    label: "Maintenance paid by tenant",
    amount: 1500,
    month: 2,
    year: YEAR,
  });
  const after = await db.payment.findUnique({ where: key });
  assert.equal(Number(after!.rentDue), BASE_RENT - 1500, "Expected drops by the credit");
  assert.equal(Number(after!.amountPaid), 4000, "Collected is untouched by a voucher");
  assert.equal(Number(after!.advanceApplied), 0, "Advance is untouched by a voucher");

  await deleteVoucher(v.id);
  const restored = await db.payment.findUnique({ where: key });
  assert.equal(Number(restored!.rentDue), BASE_RENT);
  assert.equal(Number(restored!.amountPaid), 4000);
});

test("getVouchers filters by tenant and period", async () => {
  const rows = await getVouchers({ tenantId, month: 7, year: YEAR });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "Reimbursement");
  assert.equal(rows[0].amount, 1200);

  // Month 12 is untouched by every other test in this file.
  const none = await getVouchers({ tenantId, month: 12, year: YEAR });
  assert.equal(none.length, 0);
});
