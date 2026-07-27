// Split math for trip expenses. Distributes a 2-dp money total across weighted
// participants so the parts sum EXACTLY to the total (largest-remainder of cents),
// used for both EQUAL splits (all weights 1) and the BDT canonicalization of any
// split. Keeping it pure makes the who-owes-whom arithmetic exact and testable.
import { money2 } from "./_serializers";

export interface RawShare {
  participantId: string;
  /** Required (and finite, ≥ 0) only when the split mode is EXACT. */
  amount?: number;
}

/** Split `total` (2 dp) across `weights` proportionally; parts sum exactly to `total`. */
export function distributeByWeights(total: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalCents = Math.round(money2(total) * 100);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const w = wsum > 0 ? weights : weights.map(() => 1);
  const ws = w.reduce((a, b) => a + b, 0);
  const raw = w.map((x) => (x / ws) * totalCents);
  const cents = raw.map((r) => Math.floor(r));
  let remainder = totalCents - cents.reduce((a, b) => a + b, 0);
  // Hand the leftover cents to the largest fractional parts (stable by index).
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; remainder > 0 && k < order.length; k++, remainder--) cents[order[k].i] += 1;
  return cents.map((c) => c / 100);
}

/**
 * Resolve each participant's share of `amount` (expense currency) and its BDT
 * value. EQUAL → even split; EXACT → the provided amounts (validated to sum to
 * the total). Both the currency parts and the BDT parts sum exactly to their totals.
 */
export function computeShares(
  amount: number,
  fxRate: number,
  splitMode: "EQUAL" | "EXACT",
  shares: RawShare[]
): { participantId: string; amount: number; amountBdt: number }[] {
  if (!shares.length) throw new Error("at least one participant must share the expense");
  const seen = new Set<string>();
  for (const s of shares) {
    if (seen.has(s.participantId)) throw new Error("a participant appears twice in the split");
    seen.add(s.participantId);
  }
  const total = money2(amount);
  const amountBdt = money2(amount * fxRate);

  let weights: number[];
  if (splitMode === "EXACT") {
    weights = shares.map((s) => {
      if (s.amount == null || !Number.isFinite(s.amount) || s.amount < 0)
        throw new Error("each exact share needs a finite, non-negative amount");
      return s.amount;
    });
    const sum = money2(weights.reduce((a, b) => a + b, 0));
    if (Math.abs(sum - total) > 0.001)
      throw new Error(`exact shares (${sum}) must sum to the expense amount (${total})`);
  } else {
    weights = shares.map(() => 1);
  }

  const cur = distributeByWeights(total, weights);
  const bdt = distributeByWeights(amountBdt, weights);
  return shares.map((s, i) => ({
    participantId: s.participantId,
    amount: cur[i],
    amountBdt: bdt[i],
  }));
}
