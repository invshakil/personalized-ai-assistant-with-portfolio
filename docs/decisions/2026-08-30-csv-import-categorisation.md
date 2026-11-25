# CSV import categorisation

**The Money CSV import suggests a category per description, the model runs in preview only, and a separate pure guard decides what is kept** (Shakil, 30 Aug 2026).

- **Why preview only:** `commitImport` replays the reviewed map rather than calling the model again. A second call could categorise a row differently, and the user would never know which answer landed.
- **Why the guard is separate from the call:** the JSON Schema constrains the response's shape, never its vocabulary. A pure guard can be tested without spending money.

Commits `6dc2967`, `ca11f8f`. This is entry A3 (Phase 1) of the AI integration work stream.

The problem it solves: a bank export has descriptions and no categories, so the importer used to offer a mapped column or one blanket default category.

How it works:

- It suggests a category per distinct description, few-shot prompted with the user's own last 60 filing decisions, and constrained to categories that already exist.
- Precedence is mapped column, then AI suggestion, then the blanket default.
- `reconcileAssignments` drops invented categories, kind and direction mismatches (a DEBIT filed under an INCOME category), lines nobody asked about, and low confidence.

Files: `services/money/categorize.ts`, `services/money/import.ts`, `lib/api/money.ts`, and the import UI (`AiCategorizeToggle`, `PreviewRow`, `PreviewSummaryChips`, `useCsvFile`, `useImportPreview`).

Verified: 13 unit tests on the guard. `npm run eval:categorize` runs 20 golden cases against the real API. The first run scored 18 of 19 (94.7%) and caught a real bug: see [Commit-time validation hardening](2026-08-30-commit-time-validation.md) and the confidence threshold, which was raised from 0.35 to 0.5.
