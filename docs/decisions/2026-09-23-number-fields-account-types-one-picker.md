# Calculator number fields, archivable account types and one account picker

**Every admin number input is the shared calculator `NumberField`, account types can be archived, and every account picker is the shared account type and account select** (Shakil, 23 Sep 2026).

Calculator number fields everywhere:

- The Ledger's calculator `AmountField` became the shared `NumberField` (`src/components/admin/NumberField.tsx`, logic in `src/lib/numberField.ts`), with `integer`, `min`, `max` and `decimals` rules.
- It replaced all 64 `type="number"` inputs across Property, Finance, Money, Trips and Settings.
- A wiring test forbids `type="number"` in the admin.

Archivable account types:

- A new `AccountType` model. Migration `20260923000000_account_types` seeds the five kinds and backfills every account.
- Archive and reactivate at `/admin/money/account-types`.

One account picker:

- The shared `AccountTypeAccountSelect` is used in 14 account pickers.
- It replaces the Ledger `method` picker and the Property Expense `paymentMode` picker. Both legacy columns stay for old rows.
- `Expense.accountId` was added (migration `20260923000001_property_expense_account`), so a property expense's payment mode is its account's type.
- A type and account default is registered for each form.

Also fixed: `POST /money/accounts` silently dropped `currency`.

The calculator input began as [Calculator amount input](2026-09-03-calculator-amount-input.md).
