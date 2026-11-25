# Trip Expense Manager v2: group trips

**A trip has its own split ledger, and only the owner's own cash, bank or wallet payments also post to the money ledger** (Shakil, 27 Jul 2026).

- **Why group money stays out:** collected funds and other people's payments are not the owner's money, so they must not appear in his personal net worth. This was a locked decision.
- **Why card expenses do not post:** card bills are settled in bulk separately, by the owner's rule, so a card expense is deferred.
- **Instead of:** v1, where a trip was a tag over the money ledger.

Commits `a8142e3` to `226d677`.

The model:

- New models `TripParticipant`, `TripExpense`, `TripExpenseShare`, `TripSettlement`, and the `TripSplitMode` enum. Migration `20260727000000_add_trip_groups`.
- `TripExpense` is the source of truth for every shared cost.

The rules:

- **Posting rule.** A `TripExpense` posts a linked `MoneyEntry` DEBIT only when the payer is the owner and the funding account is a real spendable account (CASH, BANK, MOBILE_WALLET or OTHER, including the trip wallet). It never posts for a CREDIT_CARD, and never for an expense someone else paid. Those live only in the trip ledger.
- **Splitting.** Each expense is split among the selected participants: equal by default, or exact per-person amounts. Cents are distributed by largest remainder, so shares always sum to the total. A participant's spend is the sum of their shares.
- **Who owes whom.** The report derives each person's paid, spent and net in BDT, and a greedy minimal-transfer settle-up list.
- **Settlements.** Contributions and settle-ups (`TripSettlement`, from one participant to another) are pure trip ledger. They never post to the money accounts.
- **Participants.** Names per trip, each optionally linked to a `Beneficiary`. Every trip seeds one `isSelf` participant. A participant with split history is soft-deleted (`isActive`) so the maths stays intact.
- **Foreign spending.** A dedicated trip wallet account (`Trip.localWalletAccountId`), funded by a cross-currency `recordTransfer` with the live rate prefilled. A wallet expense paid by the owner posts and debits the wallet. The leftover is the wallet balance. The funding transfer is tagged with the trip but is not counted as spend.
- **Public page.** `/trips/<slug>` is aggregate-safe: `getPublicTripSummary` never returns participant names, per-person spend, who owes whom, or account fields.

What was built:

- Services in `src/services/trips/*`.
- 13 API handlers.
- The admin UI in the orchestrator, hooks and components pattern.
- AI read tools `list_trips`, `get_trip_report` and `list_trip_participants`, in the `/money` scope.
- Self-cleaning scenario tests in `src/services/trips/__tests__/trips.scenarios.test.ts`.
- A v1 to v2 backfill, `scripts/backfill-trip-groups.ts`.

Then a full security, optimisation and standards audit, written up in `docs/TRIP_MANAGEMENT_AUDIT.md` (commit `3c9474a`). Findings 1 to 7 were fixed (commit `bb6466c`). Finding 8, freezing a CLOSED trip, was deferred and is still open: see [STATUS.md](../STATUS.md).
