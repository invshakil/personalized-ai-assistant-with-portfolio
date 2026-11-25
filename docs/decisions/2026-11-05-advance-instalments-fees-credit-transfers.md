# Advance instalments, payment fees, prepaid AI credit and Accounts-page transfers

**Five changes shipped together: advance edits post only the difference, payments can carry a fee, AI prepaid credit is tracked by hand, transfers start from the Accounts page, and a type lands on its default account** (Shakil, 5 Nov 2026).

Commit `7bf9d52`.

## 1. Advance instalments

- **Why:** tenants pay advances in instalments, but editing the advance never touched the Money ledger.

`updateTenant` takes an opt-in `advanceAccountId` and posts only the difference between the advance held before and after the edit:

- An increase posts a "Tenant Advance" CREDIT, marked "(top-up)".
- A decrease posts a "Tenant Advance Refund" DEBIT.
- No change posts nothing.

The difference is computed inside the same transaction as the tenant row. The Edit Tenant drawer shows an account picker only when the amount changed, labelled with the exact difference. The `update_tenant` AI tool gained `advanceAccountName`, with a preview of the difference. There is a pure `advanceDelta()` and a database test in `property/__tests__/tenantAdvance.test.ts`.

## 2. Payment fees

- **Why:** paying someone from a bank or wallet often costs a fee that the payee never receives.

`createEntry`, `updateEntry` and `recordPayment` accept `fee`. It is booked as a linked "Transfer Fee" DEBIT on the same account through the existing `feeForTransferId` self-relation, using a `createFeeEntry` helper shared with `recordTransfer`. An update rebuilds the fee from the parent's current account and date. A fee of 0 removes it. A delete cascades.

`MoneyEntryRow` gained `fee` and `feeForEntryId`. The Ledger drawer, the People "Record payment" form, the amount cell (which shows the fee beside the amount), and the `create_money_entry`, `update_money_entry` and `record_person_payment` tools all carry it.

## 3. Prepaid AI credit

- **Why:** the provider exposes no balance or expiry endpoint, so the owner records them.

Settings → AI gained a Prepaid credit card: the balance as read in the provider's Console, the as-of date, and the expiry. `AiBudget` grew three nullable columns (migration `20261105000000_ai_prepaid_credit`, applied locally through raw SQL). `getUsageSummary().credit` is the balance minus recorded spend since the as-of date, with days to expiry and an urgency chip: amber at 30 days or fewer, red when expired or empty. It is also shown on the dashboard AI panel. The figure is an estimate, because only this app's calls are metered.

Settings → AI was decomposed into `hooks/useAiBudget` and presentational cards.

## 4. Transfers from the Accounts page

The Transfer drawer moved from `money/entries/` to the module-shared `money/components` and `money/hooks`, with `money/transferForm.ts`. The Accounts page gained a Transfer button and a "Transfer from this account" action on each row, which pre-picks the source.

## 5. Type to default account

`MoneyAccount.isTypeDefault` (migration `20261105000001_account_type_default`) marks the one account a type pre-selects. The main bank account was flagged under Bank.

- `selectType` in `lib/accountPicker.ts` lands on the type's default when no account under that type is already chosen. A form filter or archiving still hides it.
- `seedSelection` does the same for a stored type with no stored account.
- The Accounts form has a "Default account for its type" switch. `createAccount` and `updateAccount` clear the type's previous default in the same transaction.

## Also fixed

A UTC day-shift in the credit dates: `dateOnly` now formats local time.

## Verified

In the browser: Accounts → Transfer pre-picks the row's account; Ledger Add Entry lands on the bank type's default account and the fee helper shows the total debited as amount plus fee; Edit Tenant shows the account picker only when the advance changes; Settings → AI shows the estimated credit left and the days to expiry.

`tsc` and eslint clean. 34 money and property database tests, 83 wiring and lib tests, and 38 picker tests are green.

A follow-up, commit `54a2ccc`, carries a payment's fee on partial updates and saves `isTypeDefault` on create.
