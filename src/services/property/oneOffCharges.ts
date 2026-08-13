import { db } from "@/lib/db";
import { toNum, toIso } from "./_serializers";
import { PaymentStatus } from "@prisma/client";

export interface OneOffChargeDTO {
  id: string;
  tenantId: string;
  label: string;
  amount: number;
  month: number;
  year: number;
  notes: string | null;
  createdAt: string | null;
}

function serialize(c: {
  id: string;
  tenantId: string;
  label: string;
  amount: { toNumber(): number } | number;
  month: number;
  year: number;
  notes: string | null;
  createdAt: Date;
}): OneOffChargeDTO {
  return {
    id: c.id,
    tenantId: c.tenantId,
    label: c.label,
    amount: toNum(c.amount),
    month: c.month,
    year: c.year,
    notes: c.notes,
    createdAt: toIso(c.createdAt),
  };
}

/**
 * The monthly bill total. Base rent + recurring add-on services + one-off
 * charges for the month + carry-forward from the previous month, less any
 * vouchers credited for the month. Pure so it can be unit-tested without a
 * database and reused wherever a bill is (re)computed.
 *
 * Floored at 0: a voucher larger than the bill zeroes it rather than producing a
 * negative due. Excess credit is not carried to the next month — issue a second
 * voucher there if that is what you want.
 */
export function computeRentDue(parts: {
  baseRent: number;
  serviceTotal: number;
  oneOffTotal: number;
  carryForward: number;
  voucherTotal?: number;
}): number {
  const gross = parts.baseRent + parts.serviceTotal + parts.oneOffTotal + parts.carryForward;
  return Math.max(0, gross - (parts.voucherTotal ?? 0));
}

function recalcStatus(rentDue: number, amountPaid: number, advanceApplied: number): PaymentStatus {
  const total = amountPaid + advanceApplied;
  if (total >= rentDue) return PaymentStatus.PAID;
  if (total > 0) return PaymentStatus.PARTIAL;
  return PaymentStatus.PENDING;
}

/**
 * Keep an already-generated bill in step when a one-off charge is added, edited
 * or removed. Adjusts that period's Payment.rentDue by `delta` and recomputes
 * its status. No-op when no payment has been generated for the period yet — the
 * next `generatePayments` run will fold the charge in from scratch.
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
  // Guaranteed >= 0 by assertDeltaAllowed, which every caller runs BEFORE it
  // touches the charge row. Left exact rather than floored: a silent max(0, …)
  // discards the overshoot and makes the matching voucher delete over-restore.
  const newRentDue = toNum(payment.rentDue) + delta;
  const status = recalcStatus(newRentDue, toNum(payment.amountPaid), toNum(payment.advanceApplied));
  await db.payment.update({ where: { id: payment.id }, data: { rentDue: newRentDue, status } });
}

/**
 * Refuse a reduction that would take the bill below the vouchers credited
 * against it — the bill would have to be floored at 0, silently losing the
 * difference, and removing that voucher later would restore more than it took.
 *
 * MUST be called before the charge row is written: these two writes are not in a
 * transaction, so throwing afterwards would leave the charge deleted and the
 * bill still carrying it.
 */
async function assertDeltaAllowed(
  tenantId: string,
  month: number,
  year: number,
  delta: number
): Promise<void> {
  if (delta >= 0) return;
  const payment = await db.payment.findUnique({
    where: { tenantId_month_year: { tenantId, month, year } },
    select: { rentDue: true },
  });
  if (!payment) return;
  if (toNum(payment.rentDue) + delta < 0) {
    throw new Error(
      "Reducing this charge would take the bill below the vouchers credited against it. " +
        "Remove or reduce this month's voucher first."
    );
  }
}

export interface GetOneOffChargesOptions {
  tenantId?: string;
  month?: number;
  year?: number;
}

export async function getOneOffCharges(opts: GetOneOffChargesOptions): Promise<OneOffChargeDTO[]> {
  const { tenantId, month, year } = opts;
  const charges = await db.oneOffCharge.findMany({
    where: {
      ...(tenantId && { tenantId }),
      ...(month && { month }),
      ...(year && { year }),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "asc" }],
  });
  return charges.map(serialize);
}

export interface CreateOneOffChargeInput {
  tenantId: string;
  label: string;
  amount: number;
  month: number;
  year: number;
  notes?: string | null;
}

export async function createOneOffCharge(input: CreateOneOffChargeInput): Promise<OneOffChargeDTO> {
  const label = input.label?.trim();
  if (!label) throw new Error("A label is required for the charge");
  if (!(input.amount > 0)) throw new Error("Amount must be greater than zero");
  if (!Number.isInteger(input.month) || input.month < 1 || input.month > 12)
    throw new Error("Month must be between 1 and 12");
  if (!Number.isInteger(input.year) || input.year < 2000)
    throw new Error("A valid year is required");

  const tenant = await db.tenant.findUnique({
    where: { id: input.tenantId },
    select: { id: true },
  });
  if (!tenant) throw new Error("Tenant not found");

  const charge = await db.oneOffCharge.create({
    data: {
      tenantId: input.tenantId,
      label,
      amount: input.amount,
      month: input.month,
      year: input.year,
      notes: input.notes?.trim() || null,
    },
  });

  await applyDeltaToPayment(input.tenantId, input.month, input.year, toNum(charge.amount));
  return serialize(charge);
}

export interface UpdateOneOffChargeInput {
  label?: string;
  amount?: number;
  notes?: string | null;
}

export async function updateOneOffCharge(
  id: string,
  input: UpdateOneOffChargeInput
): Promise<OneOffChargeDTO> {
  const existing = await db.oneOffCharge.findUnique({ where: { id } });
  if (!existing) throw new Error("Charge not found");

  const label = input.label !== undefined ? input.label.trim() : undefined;
  if (label !== undefined && !label) throw new Error("A label is required for the charge");
  if (input.amount !== undefined && !(input.amount > 0))
    throw new Error("Amount must be greater than zero");
  if (input.amount !== undefined)
    await assertDeltaAllowed(
      existing.tenantId,
      existing.month,
      existing.year,
      input.amount - toNum(existing.amount)
    );

  const updated = await db.oneOffCharge.update({
    where: { id },
    data: {
      ...(label !== undefined && { label }),
      ...(input.amount !== undefined && { amount: input.amount }),
      ...(input.notes !== undefined && { notes: input.notes?.trim() || null }),
    },
  });

  const delta = toNum(updated.amount) - toNum(existing.amount);
  await applyDeltaToPayment(existing.tenantId, existing.month, existing.year, delta);
  return serialize(updated);
}

export async function deleteOneOffCharge(id: string): Promise<{ deleted: true }> {
  const existing = await db.oneOffCharge.findUnique({ where: { id } });
  if (!existing) throw new Error("Charge not found");
  await assertDeltaAllowed(
    existing.tenantId,
    existing.month,
    existing.year,
    -toNum(existing.amount)
  );

  await db.oneOffCharge.delete({ where: { id } });
  await applyDeltaToPayment(
    existing.tenantId,
    existing.month,
    existing.year,
    -toNum(existing.amount)
  );
  return { deleted: true };
}
