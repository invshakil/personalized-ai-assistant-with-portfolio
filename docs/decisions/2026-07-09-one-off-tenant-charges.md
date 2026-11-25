# One-off tenant charges

**A tenant can be billed a one-time, non-recurring charge on one month's bill, separate from recurring service fees** (Shakil, 9 Jul 2026).

Examples are a maintenance fee or a repair. Recurring fees stay on `TenantService`.

- A new `OneOffCharge` model: `label`, `amount`, `month`, `year`, `notes`. It is linked to a `Payment` by `(tenantId, month, year)`. The schema was pushed with `prisma db push`.
- A new `src/services/property/oneOffCharges.ts`: create, read, update and delete; a pure `computeRentDue` helper; and a delta-sync that adjusts an already-generated bill's `rentDue` and status when a charge is added, edited or deleted.
- `generatePayments` folds the month's charges into `rentDue`: base rent + service total + one-off total + carry-forward.
- `getPayments` and `getPayment` return the charges.
- Routes: `GET` and `POST /property/one-off-charges`, `PUT` and `DELETE /property/one-off-charges/[id]`, with `propertyApi` client methods.
- The Payments page gained a per-row one-off charges drawer (`useOneOffCharges` and `ChargesDrawer`). `BillBreakdown` shows each charge as its own line, so base rent no longer absorbs it.
- AI tools: `add_one_off_charge` (write) and `list_one_off_charges` (read).

Since then: a `Voucher` model mirrors this for credits. A voucher is stored positive and subtracted from `rentDue`, capped at the outstanding bill.

Verified: `tsc` and eslint clean. 9 new service tests: the pure `computeRentDue`, and database integration for create, read, update and delete, the delta-sync, and inclusion at generation. The full suite passed, 58 of 58.
