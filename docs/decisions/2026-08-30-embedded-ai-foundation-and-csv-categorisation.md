# Embedded AI: phase 0 foundation and CSV categorisation

**The AI seam gained a second, non-conversational entry point, and the Money CSV import became its first user** (Shakil, 30 Aug 2026).

- **Why:** the seam had exactly one consumer. `getActiveProvider` was called only from the chat route, so every AI capability required a person typing prose into `/admin/ai-assistant`.

This is the summary entry for the day. The detail is in:

- [AI audit and plan](2026-08-30-ai-audit-and-plan.md)
- [The AI seam's second entry point](2026-08-30-ai-seam-second-entry-point.md)
- [CSV import categorisation](2026-08-30-csv-import-categorisation.md)
- [Security audit of the embedded AI work](2026-08-30-ai-security-audit.md)
- [Commit-time validation hardening](2026-08-30-commit-time-validation.md)

Foundation:

- `AiProvider.complete<T>()`: one call, schema-constrained JSON through `output_config.format`, no tool loop. Implemented in the Anthropic adapter.
- `services/ai/task.ts` (`runAiTask`, `tryAiTask`) resolves the provider, meters the spend and returns typed data.
- Model selection is per purpose (`getProviderFor`): classify and extract use the catalog's `fastModel`; analyse and chat keep the configured model.
- `AiUsage` gained `feature`, so spend can be attributed per surface, with `byFeature` in `getUsageSummary`.
- A new `AiProposedAction` model saves the propose, approve, commit gate, so cards can survive a reload and non-chat surfaces can propose. Migration `20260830000000_ai_feature_attribution_and_proposed_actions`. A new `/api/admin/ai/actions/cancel` records declines.
- The model catalog and pricing were refreshed to the Claude 5 family.

First embedded feature:

- The Money CSV import suggests categories from descriptions (`services/money/categorize.ts`). It is few-shot prompted from the user's own last 60 filing decisions and chooses only from existing categories.
- It runs in preview only. The reviewed map is replayed on commit, so what gets written is what was on screen.
- The guard, `reconcileAssignments`, is pure and unit-tested (13 cases). It drops invented categories, kind and direction mismatches, lines nobody asked about, and low confidence.
- A new eval, `npm run eval:categorize`, runs 20 golden cases against the real API: 18 of 18 correct, 100% precision, 90% coverage, at a fraction of a US cent per run. It caught a real bug on its first run: a 0.35 confidence threshold let a guess through, and it was raised to 0.5.

Verified: `tsc`, eslint and build clean; 104 of 104 tests pass.
