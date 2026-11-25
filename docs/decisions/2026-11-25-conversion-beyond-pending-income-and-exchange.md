# Conversion beyond pending income, and foreign-to-foreign exchange (#17)

**The Earnings "Convert" action is limited only by the account's real balance, and converting one foreign currency into another is an exchange, not income** (Shakil, 25 Nov 2026).

- **Why:** converting was refused whenever the amount was larger than the pending income on record, although the account held more: an opening balance or a ledger deposit is not pending income. And a foreign-to-foreign conversion was impossible.

What changed:

- **The balance is the only ceiling.** Pending earnings are consumed oldest first and realized for their pro-rata share of the BDT received. The part beyond pending income moves in the same transfer as a plain currency exchange and is booked as no income.
- **Foreign to foreign is an exchange.** The pending earnings it covers are re-denominated into the new currency and stay pending until they reach BDT.
- **One exchange hop per earning.** Exchanging income that already came from an exchange is refused: convert it to BDT, or undo the first exchange.
- **One transaction,** under a PostgreSQL advisory lock, with the balance and pending checks inside it, so two conversions at once can't both pass.

The service is `convertEarnings` in `src/services/finance/conversion.ts`; the allocation maths is the pure, unit-tested `conversionPlan.ts`. Migration `20261125000000_earning_exchange` adds four nullable columns and an index to `Earning`.

Commit `5afa813`.
