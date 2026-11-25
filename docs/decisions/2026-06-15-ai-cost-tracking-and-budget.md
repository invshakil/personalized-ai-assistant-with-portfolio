# AI cost tracking and a monthly budget

**Every chat turn's tokens are metered and priced in USD, and an enforced monthly budget blocks new turns** (Shakil, 15 Jun 2026).

- **Why USD:** it is the provider's billing unit, so it is kept separate from BDT on purpose.

What was added:

- New `AiUsage` and `AiBudget` models and a migration.
- `services/ai/pricing.ts`: per-model rates per million tokens, including cache.
- `services/ai/usage.ts`: `recordUsage`, `getUsageSummary`, `getBudget`, `setBudget`, `isOverBudget`.
- The Anthropic adapter adds up usage across tool-loop rounds and emits a `usage` stream event. The chat route records it.
- The chat route blocks with a 402 before streaming when month-to-date spend is at or over the enforced limit.
- Settings → AI gained a budget card: limit, enforce switch and a month-to-date bar.
- The home dashboard gained AI-spend cards and a monthly-cost bar chart (`AiSpendPanel`).
- The assistant page shows a banner and disables input when over budget.
- Routes: `/api/admin/ai/usage` and `/api/admin/ai/budget`.

Verified: `tsc`, eslint and build clean. The cost maths, budget enforcement (over and under) and the 12-month chart series were checked against the database.
