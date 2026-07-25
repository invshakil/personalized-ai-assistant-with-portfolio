// Trip wallet funding — convert money from a home account into the trip's foreign
// "wallet" account. This is a normal cross-currency TRANSFER (recordTransfer stores
// the FX rate); it is tagged with tripId so it shows in the trip's money flow but
// is NOT counted as trip spend (the spend happens when money leaves the wallet).
import { recordTransfer } from "@/services/money/entries";
import type { MoneyEntryRow } from "@/types";

export interface FundTripWalletInput {
  tripId: string;
  /** Home account the money leaves (e.g. a BDT bank/cash account). */
  fromAccountId: string;
  /** The trip's local-currency wallet account. */
  toAccountId: string;
  /** Amount leaving the source, in the source account's currency. */
  amount: number;
  /** Amount arriving in the wallet, in the destination currency (required cross-currency). */
  toAmount?: number;
  date: string;
  notes?: string | null;
}

export async function fundTripWallet(input: FundTripWalletInput): Promise<MoneyEntryRow> {
  if (input.fromAccountId === input.toAccountId) {
    throw new Error("Funding source and wallet must be different accounts");
  }
  if (Number.isNaN(new Date(input.date).getTime())) throw new Error("date is not a valid date");
  return recordTransfer({
    fromAccountId: input.fromAccountId,
    toAccountId: input.toAccountId,
    amount: input.amount,
    toAmount: input.toAmount,
    date: input.date,
    description: "Trip wallet funding",
    notes: input.notes ?? null,
    tripId: input.tripId,
  });
}
