# Transfer fees

**A transfer's fee is a separate expense entry on the source account, linked to the transfer, so it shows up as a real expense** (Shakil, 11 Jul 2026).

An account-to-account transfer can carry a fee that the source charges, for example a mobile-wallet cash-out fee.

- `recordTransfer` takes an optional `fee`, in the source currency.
- The transfer and a separate EXPENSE DEBIT for the fee, on the source account, are written in one `db.$transaction`. The source is debited `amount + fee`, and the destination still receives the full `toAmount`.
- The fee appears in income, expense and savings figures as a real expense. Its category, "Transfer Fee", is created automatically.
- A new self-relation, `MoneyEntry.feeForTransferId` with `onDelete: Cascade`, links the fee to its transfer, so deleting the transfer removes the fee. Migration `20260711000000_add_transfer_fee_link`.
- The Transfer drawer gained an optional Fee field with a live helper showing the total debited and the effective percentage.
- `POST /money/transfers` and `moneyApi.transfer` carry `fee`.
- The `record_money_transfer` AI tool gained a `fee` parameter and a note in its preview and summary.

Since then: the same link is used for a fee on a payment, not only on a transfer. See [Advance instalments, payment fees, prepaid AI credit and Accounts-page transfers](2026-11-05-advance-instalments-fees-credit-transfers.md).

Verified: `tsc` and eslint clean. 3 new money scenario tests: the fee debits the source by amount plus fee and books the expense; deleting the transfer cascades to the fee; the AI tool passes the fee through. The suite is green.
