# Realized-basis foreign income, and Convert to BDT

**Foreign income counts as BDT income only when it is converted to BDT, not when it is earned** (Shakil, 30 Jun 2026).

- **Instead of:** counting a foreign earning as BDT income at an estimated rate on the day it was earned.

How it works:

- `Earning` gained `realizedAt`, `realizedAmount`, `realizedRate` and `transferEntryId` (migration `20260630000000_earning_realization`).
- A foreign earning is pending (`realizedAt` is null, and it is excluded from the BDT profit and loss) until a Convert to BDT action realizes it.
- BDT earnings are realized when earned. Existing BDT rows were backfilled with `realizedAt = date`, so report numbers are unchanged to the cent.
- `convertEarnings` takes one or more pending earnings in the same currency. It posts a single cross-currency Money transfer, from the foreign account to the BDT account, at the actual rate, and splits the realized BDT back onto each earning, with rounding reconciled.
- `reverseConversion` undoes it.
- A new `src/services/finance/_realized.ts` (`getRealizedEarnings`) is the single seam. Every earning-income aggregation in `dashboard.ts`, `reports.ts` and `admin/overview.ts` sums `realizedAmount` bucketed by `realizedAt`, the conversion period. There is a `pendingForeign` panel.
- The Earnings page gained a Convert-to-BDT drawer, a pending or converted status per row, and a pending-conversion summary.
- Routes: `POST /finance/earnings/convert` and `[id]/reverse-conversion`.
- The Money ledger gained a currency filter and per-currency split totals (`getEntries` currency filter).

Salary payments stay on a pay-date basis. Realized basis applies to income only.

Since then: conversion is no longer limited to pending income going to BDT. See the Conversion and exchange section of [ARCHITECTURE.md](../ARCHITECTURE.md#conversion-and-exchange).

Verified: build, lint and `tsc` clean; 13 of 13 `test:money` tests. A run of pending, bulk convert and reverse confirmed that income is booked in the conversion month, balances move, and the BDT regression holds to the cent.
