// Pure helpers behind the "Convert currency" drawer — no React, unit-tested.
import type { MoneyAccountRow } from "@/types";
import type { EarningRow } from "../types";

type AccountLike = Pick<MoneyAccountRow, "currency" | "balance" | "isActive" | "accountTypeActive">;

export interface PendingByCurrency {
  currency: string;
  /** Total pending income, in the original currency. */
  original: number;
  count: number;
  /** Real ledger balance still held in that currency's account(s). */
  availableBalance: number;
}

const balanceIn = (accounts: AccountLike[], currency: string) =>
  accounts.filter((a) => a.currency === currency).reduce((s, a) => s + a.balance, 0);

/**
 * Pending income per currency, next to the real balance in that currency. The
 * two differ whenever income was spent straight from the account, or the
 * account holds money that never was pending income.
 */
export function pendingByCurrency(
  pending: Pick<EarningRow, "currency" | "originalAmount">[],
  accounts: AccountLike[]
): PendingByCurrency[] {
  const m = new Map<string, { original: number; count: number }>();
  for (const e of pending) {
    const c = m.get(e.currency) ?? { original: 0, count: 0 };
    c.original += e.originalAmount;
    c.count += 1;
    m.set(e.currency, c);
  }
  return [...m.entries()].map(([currency, v]) => ({
    currency,
    ...v,
    availableBalance: balanceIn(accounts, currency),
  }));
}

/**
 * Currencies the drawer can convert out of: every currency with pending income,
 * then any other foreign currency a selectable account actually holds money in.
 */
export function convertibleCurrencies(
  pending: PendingByCurrency[],
  accounts: AccountLike[]
): string[] {
  const out = pending.map((p) => p.currency);
  const held = accounts
    // Same rule the account picker applies: active account under an active type.
    .filter((a) => a.currency !== "BDT" && a.isActive && a.accountTypeActive && a.balance > 0.005)
    .map((a) => a.currency)
    .sort();
  for (const c of held) if (!out.includes(c)) out.push(c);
  return out;
}

export interface ConversionCheck {
  /** More than the source account holds — the only thing that blocks a conversion. */
  exceedsBalance: boolean;
  /** Share of the amount backed by pending income. */
  covered: number;
  /** Share beyond the pending income — converts as a plain exchange, not income. */
  uncovered: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function conversionCheck(input: {
  amount: number;
  balance: number;
  pendingTotal: number;
}): ConversionCheck {
  const amount = Math.max(0, input.amount);
  const covered = round2(Math.min(amount, Math.max(0, input.pendingTotal)));
  const uncovered = round2(amount - covered);
  return {
    exceedsBalance: amount > input.balance + 0.01,
    covered,
    uncovered: uncovered > 0.005 ? uncovered : 0,
  };
}

/**
 * Destination units per 1 source unit, from each side's BDT rate (BDT itself is
 * 1). Returns 0 when either rate is unusable, so the caller leaves the field blank.
 */
export function crossRate(fromBdtRate: number, toBdtRate: number): number {
  if (!(fromBdtRate > 0) || !(toBdtRate > 0)) return 0;
  return fromBdtRate / toBdtRate;
}
