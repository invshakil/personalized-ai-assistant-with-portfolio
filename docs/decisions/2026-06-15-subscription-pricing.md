# Subscription pricing: price changes and discounts

**A subscription's monthly charge is the month's override, else the latest rate change on or before that month, else the base amount** (Shakil, 15 Jun 2026).

- New models and a migration: `SubscriptionRateChange` (an effective-dated rate) and `SubscriptionMonthOverride` (a final amount for one month, for a discount or coupon).
- `generateSubscriptionCharges` was rewritten. It computes each month's amount by the rule above and upserts the `BizExpense`, so a charge is re-priced when the pricing changes. Existing charges are loaded in one batch.
- New service functions: `addRateChange`, `deleteRateChange`, `setMonthOverride`, `clearMonthOverride`.
- Routes under `/subscriptions/[id]/rate-changes(/[rcId])` and `/overrides`.
- `currentMonthlyAmount` is returned on the list and detail, and is used for the run-rate, including in the AI report.
- The Subscriptions page gained a "Manage pricing & history" drawer: add, list and delete price changes, and an "Adjust" override per month.

A time-zone bug was fixed in the same work. Month strings are now parsed by their literal components, and an ISO date is turned into a month through local components. Checked in Asia/Dhaka and America/Los_Angeles.

Verified: build, lint and `tsc` clean. The full flow of price change, override, clear and revert was run.
