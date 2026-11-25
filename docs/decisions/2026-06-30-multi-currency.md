# Multi-currency in the Financial Tracker and Money Manager

**Foreign income, foreign salaries and foreign-currency accounts can be recorded, while `amount` stays in BDT so every report is unchanged** (Shakil, 30 Jun 2026).

- **Why `amount` stays BDT:** every report sums `amount`. Keeping it BDT-canonical, computed on the server as `round(originalAmount × fxRate, 2)`, means the reports and dashboards did not need to change.

What was added:

- A shared `src/services/_shared/fx.ts`: the live BDT rate from `open.er-api.com` (free, no key), cached in a new `FxRate` model. `GET /api/admin/fx-rate` prefills the editable rate on a foreign transaction.
- `Earning` and `EmployeePayment` gained `currency`, `originalAmount` and `fxRate` (BDT per 1 unit). The add and edit drawers have a currency select, an editable auto-fetched rate and a BDT preview. Lists, receipts and PDFs show the foreign original alongside.
- `MoneyAccount` gained `currency`: one per account, and its balance is in that currency.
- `MoneyEntry` gained `toAmount` (the destination amount of a cross-currency transfer, in the destination currency) and `fxRate`.
- Account balances stay native. The Money dashboard converts to a combined BDT total at the latest rate, with a per-currency breakdown and an as-of date. Savings series convert per row.
- `recordLinkedEntry` posts in the destination account's currency.
- The rate used for a transaction is stored on its row. The `FxRate` cache is only for valuing current balances.
- Migration `20260629000000_add_multicurrency`, a proper Prisma migration: `migrate deploy` on production, applied locally through `scripts/apply-migration.ts`.
- AI tools were updated: `create_money_account` takes a currency, `record_money_transfer` takes `toAmount`, and the descriptions of `list_earnings`, `list_salary_payments` and `get_account_balances` were refreshed. The `scripts/money.ts` CLI was updated too.

Verified: `tsc`, eslint and build clean. 12 of 12 `test:money` tests pass, with the BDT regression intact. The live rate, a foreign account and a cross-currency transfer were run.
