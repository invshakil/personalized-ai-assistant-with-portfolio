// Vouchers — a credit applied to one month's bill. Use when the tenant is owed
// something against their rent: a discount, or a reimbursement for a cost they
// fronted that the landlord owes (e.g. maintenance).
//
// The mirror image of oneOffCharges.ts: a voucher is stored as a POSITIVE amount
// and applied to the generated bill as a NEGATIVE delta, so rentDue drops and the
// payment status recomputes. A voucher may settle a bill but never exceed what is
// still owed on it — see assertWithinBill for why that single cap is what keeps
// the credit reversible and stops it being silently swallowed.
import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";
import { PaymentStatus } from "@prisma/client";

export interface VoucherDTO {
  id: string;
  tenantId: string;
  label: string;
  amount: number;
  month: number;
  year: number;
  notes: string | null;
  createdAt: string | null;
}

function serialize(v: {
  id: string;
  tenantId: string;
  label: string;
  amount: { toNumber(): number } | number;
  month: number;
  year: number;
  notes: string | null;
  createdAt: Date;
}): VoucherDTO {
  return {
    id: v.id,
    tenantId: v.tenantId,
    label: v.label,
    amount: toNum(v.amount),
    month: v.month,
    year: v.year,
    notes: v.notes,
    createdAt: toIso(v.createdAt),
  };
}

function recalcStatus(rentDue: number, amountPaid: number, advanceApplied: number): PaymentStatus {
  const total = amountPaid + advanceApplied;
  if (total >= rentDue) return PaymentStatus.PAID;
  if (total > 0) return PaymentStatus.PARTIAL;
  return PaymentStatus.PENDING;
}

/**
 * Keep an already-generated bill in step when a voucher is added, edited or
 * removed. `delta` is signed in bill terms — issuing a 2,000 voucher passes
 * -2,000. No-op when no payment exists for the period yet; the next
 * `generatePayments` run folds the voucher in from scratch.
 */
async function applyDeltaToPayment(
  tenantId: string,
  month: number,
  year: number,
  delta: number
): Promise<void> {
  if (delta === 0) return;
  const payment = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month, year } },
    select: { id: true, rentDue: true, amountPaid: true, advanceApplied: true },
  });
  if (!payment) return;
  // assertWithinBill guarantees this stays >= 0. Left exact rather than floored:
  // a silent max(0, …) here is precisely what made deletes over-restore before.
  const newRentDue = toNum(payment.rentDue) + delta;
  const status = recalcStatus(newRentDue, toNum(payment.amountPaid), toNum(payment.advanceApplied));
  await db.payment.update({ where: { id: payment.id }, data: { rentDue: newRentDue, status } });
}

const taka = (n: number) => `৳${n.toLocaleString("en-IN")}`;

/**
 * The month's bill BEFORE any voucher, plus what has already been settled
 * against it.
 *
 * When the rent row exists, `rentDue` already has every voucher subtracted and
 * (by the cap below) is never clamped, so adding the vouchers back recovers the
 * gross exactly — no dependence on the unit's current rent, which may have moved
 * since the bill was cut.
 *
 * When it doesn't exist yet, the bill is computed from the same components
 * `generatePayments` will use, so a voucher raised ahead of generation is capped
 * against the bill it is actually going to meet.
 */
async function periodBill(
  tenantId: string,
  month: number,
  year: number
): Promise<{ gross: number; settled: number }> {
  const [payment, vouchers] = await Promise.all([
    db.payment.findUnique({
      where: { tenantId_month_year: { tenantId, month, year } },
      select: { rentDue: true, amountPaid: true, advanceApplied: true },
    }),
    db.voucher.findMany({ where: { tenantId, month, year }, select: { amount: true } }),
  ]);
  const voucherTotal = vouchers.reduce((sum, v) => sum + toNum(v.amount), 0);

  if (payment) {
    return {
      gross: toNum(payment.rentDue) + voucherTotal,
      settled: toNum(payment.amountPaid) + toNum(payment.advanceApplied),
    };
  }

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      unit: { select: { monthlyRent: true } },
      services: { where: { isActive: true }, select: { monthlyFee: true } },
      oneOffCharges: { where: { month, year }, select: { amount: true } },
    },
  });
  if (!tenant) return { gross: 0, settled: 0 };

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const prev = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month: prevMonth, year: prevYear } },
    select: { rentDue: true, amountPaid: true, advanceApplied: true },
  });
  const carryForward = prev
    ? Math.max(0, toNum(prev.rentDue) - toNum(prev.amountPaid) - toNum(prev.advanceApplied))
    : 0;

  const gross =
    (tenant.unit ? toNum(tenant.unit.monthlyRent) : 0) +
    tenant.services.reduce((sum, s) => sum + toNum(s.monthlyFee), 0) +
    tenant.oneOffCharges.reduce((sum, c) => sum + toNum(c.amount), 0) +
    carryForward;
  return { gross, settled: 0 };
}

/**
 * Cap a voucher at the month's UNPAID remainder. This single rule is what keeps
 * the credit honest in three ways:
 *
 *  1. Vouchers never exceed the bill, so `applyDeltaToPayment` never hits its
 *     `max(0, …)` floor. Without that, the overshoot is discarded and deleting
 *     the voucher restores MORE than it took off (a ৳10,000 bill came back as
 *     ৳20,000).
 *  2. The check works before the rent row exists, using the prospective bill —
 *     otherwise a voucher raised ahead of `generatePayments` skipped the cap
 *     entirely and hit exactly that bug.
 *  3. Crediting past what the tenant still owes would push the bill under what
 *     they have already paid, and that overpayment is silently dropped by
 *     `carryForward`'s own `max(0, …)`. Refusing it keeps the money visible.
 *
 * `replacing` is the current amount of the voucher being edited — that credit is
 * about to be handed back, so it counts as headroom rather than against itself.
 */
async function assertWithinBill(
  tenantId: string,
  month: number,
  year: number,
  amount: number,
  replacing = 0
): Promise<void> {
  const { gross, settled } = await periodBill(tenantId, month, year);
  const otherVouchers = await db.voucher.aggregate({
    where: { tenantId, month, year },
    _sum: { amount: true },
  });
  const credited = toNum(otherVouchers._sum.amount) - replacing;
  const headroom = gross - settled - credited;

  if (amount > headroom) {
    if (headroom <= 0 && settled > 0) {
      throw new Error(
        `This month's bill is already settled, so a ${taka(amount)} credit would be lost. ` +
          `Issue the voucher against a later month instead.`
      );
    }
    throw new Error(
      `Voucher exceeds the bill. The most you can credit for this month is ${taka(Math.max(0, headroom))}.`
    );
  }
}

export interface GetVouchersOptions {
  tenantId?: string;
  month?: number;
  year?: number;
}

export async function getVouchers(opts: GetVouchersOptions): Promise<VoucherDTO[]> {
  const { tenantId, month, year } = opts;
  const vouchers = await db.voucher.findMany({
    where: {
      ...(tenantId && { tenantId }),
      ...(month && { month }),
      ...(year && { year }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "asc" }],
  });
  return vouchers.map(serialize);
}

export interface CreateVoucherInput {
  tenantId: string;
  label: string;
  amount: number;
  month: number;
  year: number;
  notes?: string | null;
}

export async function createVoucher(input: CreateVoucherInput): Promise<VoucherDTO> {
  const label = input.label?.trim();
  if (!label) throw new Error("A label is required for the voucher");
  if (!Number.isFinite(input.amount) || !(input.amount > 0))
    throw new Error("Amount must be greater than zero");
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12)
    throw new Error("Month must be between 1 and 12");
  if (!Number.isInteger(input.year) || input.year < 2000)
    throw new Error("A valid year is required");

  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true },
  });
  if (!tenant) throw new Error("Tenant not found");
  await assertWithinBill(input.tenantId, input.month, input.year, input.amount);

  const voucher = await db.voucher.create({
    data: {
      tenantId: input.tenantId,
      label,
      amount: input.amount,
      month: input.month,
      year: input.year,
      notes: input.notes?.trim() || null,
    },
  });

  await applyDeltaToPayment(input.tenantId, input.month, input.year, -toNum(voucher.amount));
  return serialize(voucher);
}

export interface UpdateVoucherInput {
  label?: string;
  amount?: number;
  notes?: string | null;
}

export async function updateVoucher(id: string, input: UpdateVoucherInput): Promise<VoucherDTO> {
  const existing = await db.voucher.findUnique({ where: { id } });
  if (!existing) throw new Error("Voucher not found");

  const label = input.label !== undefined ? input.label.trim() : undefined;
  if (label !== undefined && !label) throw new Error("A label is required for the voucher");
  if (input.amount !== undefined && (!Number.isFinite(input.amount) || !(input.amount > 0)))
    throw new Error("Amount must be greater than zero");
  if (input.amount !== undefined)
    await assertWithinBill(
      existing.tenantId,
      existing.month,
      existing.year,
      input.amount,
      toNum(existing.amount)
    );

  const updated = await db.voucher.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
    },
  });

  // A bigger voucher means a bigger reduction, so the bill delta is the negated
  // change in voucher value.
  const delta = -(toNum(updated.amount) - toNum(existing.amount));
  await applyDeltaToPayment(existing.tenantId, existing.month, existing.year, delta);
  return serialize(updated);
}

export async function deleteVoucher(id: string): Promise<{ deleted: true }> {
  const existing = await db.voucher.findUnique({ where: { id } });
  if (!existing) throw new Error("Voucher not found");

  await db.voucher.delete({ where: { id } });
  await applyDeltaToPayment(
    existing.tenantId,
    existing.month,
    existing.year,
    toNum(existing.amount)
  );
  return { deleted: true };
}
