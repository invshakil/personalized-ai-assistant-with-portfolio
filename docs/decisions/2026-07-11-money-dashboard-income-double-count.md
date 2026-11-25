# Money dashboard income double-count fixed

**On the Money dashboard the ledger is the single source of truth for income; venture take-home is shown as context and is never added to it** (Shakil, 11 Jul 2026).

- **Why:** the overview headline computed `income = recordedIncome + ventureTotal`. Every property or business earning that had been posted into the ledger through the opt-in `recordLinkedEntry` bridge was counted twice: once as a ledger CREDIT and once as venture net.

The fix, in `useMoneyInsights`:

- Income is recorded ledger credits only.
- Savings is income minus expense.
- The monthly trend is ledger-only.
- Venture take-home (property net plus business net) stays on its own read-only card as context.
- The Income subtitle and the venture card's tooltip and caption were reworded to say that venture income is context, and is counted once it is posted to an account.

No schema or service change was needed. The service totals were already ledger-only; only the blend in the view layer was removed.

Verified: `tsc`, eslint and prettier clean.
