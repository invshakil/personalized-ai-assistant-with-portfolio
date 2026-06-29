// JSON-safe converters for Prisma Decimal and Date values.
// Every value returned by a finance service must be a plain JSON primitive.

export function toNum(val: { toNumber(): number } | number | null | undefined): number {
  if (val == null) return 0;
  if (typeof val === "object" && "toNumber" in val) return val.toNumber();
  return Number(val);
}

export function toIso(val: Date | null | undefined): string | null {
  return val?.toISOString() ?? null;
}

// ── Multi-currency money resolution ───────────────────────────────────────────
// Earning/EmployeePayment keep `amount` as the canonical BDT value (all reports
// sum it). These three columns capture the original currency. The invariant,
// computed server-side (never trust the client for the canonical column):
//   amount (BDT) = round(originalAmount × fxRate, 2)

export interface MoneyInput {
  currency?: string;
  originalAmount?: number;
  fxRate?: number;
  /** Legacy/back-compat: callers that only know BDT pass `amount`. */
  amount?: number;
}

export interface ResolvedMoney {
  currency: string;
  originalAmount: number;
  fxRate: number;
  amount: number; // BDT, canonical
}

/**
 * Normalize a create/update money input into the four stored columns. BDT forces
 * fxRate=1. Legacy callers passing only `amount` resolve to a BDT row unchanged.
 * Throws on a missing amount or a non-positive rate.
 */
export function resolveMoney(input: MoneyInput): ResolvedMoney {
  const currency = (input.currency ?? "BDT").toUpperCase();
  const fxRate = currency === "BDT" ? 1 : (input.fxRate ?? 1);
  if (!(fxRate > 0)) throw new Error("fxRate must be greater than 0");
  const originalAmount = input.originalAmount ?? input.amount;
  if (originalAmount == null || !(originalAmount > 0)) {
    throw new Error("amount must be greater than 0");
  }
  const amount = Math.round(originalAmount * fxRate * 100) / 100;
  return { currency, originalAmount, fxRate, amount };
}

/**
 * Merge a partial update over an existing row's currency fields, then re-resolve
 * so `amount` (BDT) is recomputed whenever currency/originalAmount/fxRate change.
 */
export function resolveMoneyUpdate(
  input: MoneyInput,
  current: { currency: string; originalAmount: number; fxRate: number }
): ResolvedMoney | null {
  const touched =
    input.currency !== undefined ||
    input.originalAmount !== undefined ||
    input.fxRate !== undefined ||
    input.amount !== undefined;
  if (!touched) return null;
  const currency = (input.currency ?? current.currency).toUpperCase();
  // When flipping to BDT, force an identity rate regardless of the prior fx.
  const fxRate =
    currency === "BDT" ? 1 : (input.fxRate ?? (current.currency === currency ? current.fxRate : 1));
  const originalAmount = input.originalAmount ?? input.amount ?? current.originalAmount;
  return resolveMoney({ currency, originalAmount, fxRate });
}
