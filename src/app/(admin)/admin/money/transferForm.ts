// Form state for the "Transfer between accounts" drawer, shared by the Ledger
// (entries) and Accounts pages.
import { todayInput } from "./format";

export type TransferForm = {
  date: string;
  /** Filters only — narrow each side's account list; never sent to the API. */
  fromAccountTypeId: string;
  fromAccountId: string;
  toAccountTypeId: string;
  toAccountId: string;
  amount: string;
  /** Destination amount (destination currency) for a cross-currency transfer. */
  toAmount: string;
  /** Fee charged by the source account (source currency) — booked as an expense. */
  fee: string;
  description: string;
};

export const BLANK_TRANSFER: TransferForm = {
  date: todayInput(),
  fromAccountTypeId: "",
  fromAccountId: "",
  toAccountTypeId: "",
  toAccountId: "",
  amount: "",
  toAmount: "",
  fee: "",
  description: "",
};

/**
 * Reverse a transfer's direction — the Swap control between From and To.
 *
 * The two amounts are positional, not labelled: `amount` is in the source's
 * currency, `toAmount` in the destination's. On a cross-currency transfer
 * (10,000 BDT out → 380 MYR in) swapping only the accounts would leave 10,000
 * sitting under a MYR label, so the amounts travel with them and the result is
 * the exact inverse transfer. An empty `toAmount` means same-currency (or not
 * filled in yet), where `amount` must stay put rather than be blanked.
 *
 * `fee` is deliberately left alone. It is an optional number the user typed;
 * its field is relabelled with the new source currency, which is better than
 * silently discarding the input.
 */
export function swapTransferDirection(t: TransferForm): TransferForm {
  const amountsArePaired = t.toAmount !== "";
  return {
    ...t,
    fromAccountTypeId: t.toAccountTypeId,
    fromAccountId: t.toAccountId,
    toAccountTypeId: t.fromAccountTypeId,
    toAccountId: t.fromAccountId,
    ...(amountsArePaired && { amount: t.toAmount, toAmount: t.amount }),
  };
}
