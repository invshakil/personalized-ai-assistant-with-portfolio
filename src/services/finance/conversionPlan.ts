// Pure allocation maths for a currency conversion out of a foreign account —
// no DB access, so every rule here is unit-tested directly.
//
// A conversion moves `amount` (source currency) out of an account and lands
// `toAmount` (destination currency) in another. Pending foreign earnings in the
// source currency are consumed oldest-first; whatever the conversion moves
// BEYOND the pending income on record is a plain currency exchange of balance
// that was never pending income (an opening balance, a ledger deposit…), so it
// is carried by the transfer but attributed to no earning.

export const round2 = (n: number) => Math.round(n * 100) / 100;
export const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** A pending earning's face value in the source currency. */
export interface PendingSlice {
  id: string;
  orig: number;
}

export interface ConversionAllocation {
  id: string;
  /** Source-currency share of this earning the conversion consumed. */
  orig: number;
  /** Destination-currency amount attributed to that share. */
  dest: number;
}

export interface ConversionPlan {
  /** Destination units per 1 source unit — the actual rate of the whole conversion. */
  rate: number;
  /** Portion of `amount` backed by pending earnings (source currency). */
  coveredSource: number;
  /** Portion moved as a plain exchange — backed by no pending earning. */
  uncoveredSource: number;
  /** Destination amount attributed to the pending earnings (sums the allocations). */
  coveredDest: number;
  allocations: ConversionAllocation[];
  /** The earning straddling the boundary, when the amount stops mid-earning. */
  split: { id: string; consumed: number; leftover: number } | null;
}

const EPS = 0.005;

/**
 * Plan a conversion of `amount` → `toAmount` against the pending earnings
 * (already ordered oldest-first). Never throws on "more than pending": the
 * excess is simply left uncovered.
 */
export function planConversion(input: {
  amount: number;
  toAmount: number;
  pending: PendingSlice[];
}): ConversionPlan {
  const amount = round2(input.amount);
  const toAmount = round2(input.toAmount);
  if (!(amount > 0)) throw new Error("Amount to convert must be greater than 0");
  if (!(toAmount > 0)) throw new Error("Received amount must be greater than 0");

  const rate = round6(toAmount / amount);
  if (!(rate > 0)) throw new Error("Received amount is too small for the amount converted");
  const totalPending = round2(input.pending.reduce((s, p) => s + p.orig, 0));
  const fullyCovered = totalPending >= amount - EPS;
  const coveredSource = fullyCovered ? amount : totalPending;
  const uncoveredSource = round2(amount - coveredSource);

  // Walk oldest-first until the covered share is consumed; the earning that
  // straddles the boundary (if any) is split.
  const consumed: { id: string; orig: number }[] = [];
  let split: ConversionPlan["split"] = null;
  let remaining = coveredSource;
  for (const p of input.pending) {
    if (remaining <= EPS) break;
    if (!(p.orig > 0)) continue;
    if (p.orig <= remaining + EPS) {
      consumed.push({ id: p.id, orig: p.orig });
      remaining = round2(remaining - p.orig);
    } else {
      split = { id: p.id, consumed: remaining, leftover: round2(p.orig - remaining) };
      consumed.push({ id: p.id, orig: remaining });
      remaining = 0;
    }
  }

  // The earnings' share of the destination amount is pro-rata by source amount.
  const coveredDest =
    consumed.length === 0
      ? 0
      : fullyCovered
        ? toAmount
        : round2((toAmount * coveredSource) / amount);

  // Split per earning, then push the rounding remainder onto the largest share
  // so the parts sum exactly to what the earnings are owed.
  const allocations = consumed.map((c) => ({ ...c, dest: round2(c.orig * rate) }));
  if (allocations.length > 0) {
    const allocated = round2(allocations.reduce((s, a) => s + a.dest, 0));
    const remainder = round2(coveredDest - allocated);
    if (remainder !== 0) {
      const biggest = allocations.reduce((mi, a, i, arr) => (a.orig > arr[mi].orig ? i : mi), 0);
      allocations[biggest].dest = round2(allocations[biggest].dest + remainder);
    }
  }

  // A share that rounds to nothing would zero out a real earning's value.
  if (allocations.some((a) => !(a.dest > 0))) {
    throw new Error("Received amount is too small to attribute to the earnings it covers");
  }

  return { rate, coveredSource, uncoveredSource, coveredDest, allocations, split };
}

/**
 * Divide a remembered pre-exchange amount between the two halves of a split
 * earning, pro-rata by face value, with the leftover taking the rounding
 * remainder so the two parts still sum to the original.
 */
export function splitProRata(
  total: number,
  consumedShare: number,
  wholeFace: number
): { consumed: number; leftover: number } {
  if (!(wholeFace > 0)) return { consumed: round2(total), leftover: 0 };
  const consumed = round2((total * consumedShare) / wholeFace);
  return { consumed, leftover: round2(total - consumed) };
}
