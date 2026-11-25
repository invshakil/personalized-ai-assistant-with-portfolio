# Account deposits with a source method

**A deposit into a Money Manager account can record how it arrived, separately from the income category** (Shakil, 2 Jul 2026).

- `MoneyEntry` gained `method` (`MoneyEntryMethod`: CASH, BANK_TRANSFER, MOBILE_BANKING, CHEQUE, OTHER). It is for CREDIT entries only: the service throws if it is set on a DEBIT or a TRANSFER. Migration `20260702000000_add_money_entry_method`.
- The Accounts page gained a Deposit action on each row. It deep-links with `?deposit=<accountId>` and opens the Ledger's existing Add Entry drawer, pre-filled as a CREDIT entry for that account.
- The drawer showed a "Source (how it arrived)" select for CREDIT entries only, and the ledger table showed the method as a caption under the category.
- The `create_money_entry` and `update_money_entry` AI tools gained a matching `method` parameter.

Since then: the "Source (how it arrived)" select was replaced by the account type and account picker. The `method` column stays for old rows and is shown read-only. See [Calculator number fields, archivable account types and one account picker](2026-09-23-number-fields-account-types-one-picker.md).

Verified: `tsc` and eslint clean. A headless-browser pass ran deposit, balance update, edit (the method persists) and delete.
