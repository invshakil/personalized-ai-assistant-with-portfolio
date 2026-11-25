# Trip Expense Manager v1, and dynamic currencies

**The first Trip Expense Manager treated a trip as a tag over the money ledger, and every currency picker switched to a live FX-sourced list** (Shakil, 26 Jul 2026).

Commit `cf3f73b`.

Trip Expense Manager v1:

- `Trip` and `TripBudget` models.
- A trip was a tag over the money ledger.
- Budget against actual.
- Funding of a foreign-currency trip wallet.
- A public share page.

Dynamic currencies, in the same commit:

- Every currency picker moved from a hardcoded BDT, USD and EUR list to the searchable `CurrencySelect` and `CurrencyMultiSelect`.
- The options come live from the FX feed: `getCurrencyOptions`, served by `GET /api/admin/currencies`.

The trip model was replaced the next day by a group model with its own split ledger. See [Trip Expense Manager v2](2026-07-27-trip-expense-manager-v2-group-trips.md).
