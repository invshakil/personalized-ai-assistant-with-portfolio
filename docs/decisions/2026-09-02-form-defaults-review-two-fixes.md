# Form defaults: code review and two fixes

**A stored default is checked against exactly the options the dropdown renders, and the server reports back the default rows it wrote** (Shakil, 2 Sep 2026).

This is entry D5 of the form defaults work stream. The shipped feature was reviewed against the log and `FORM_DEFAULTS_PLAN.md`. The architecture held: the server decides the mode, the registry is a hard gate, `openEdit` never seeds, and a failed fetch degrades to the old behaviour. Two bugs were found, both reproduced against the live database before being fixed.

## 1. `seed()` was validated against the wrong option list

`openAdd` checked the stored category against every category, while the drawer renders only those matching the direction's kind. A last-used INCOME category therefore passed the check, rendered as an empty field (`SearchableSelect` resolves an unmatched value to `null`), and was then refused by the server: "A DEBIT entry needs an EXPENSE category". An error on a field that looks blank.

This was rule 2 of [the plan](2026-09-02-form-defaults-plan.md) applied to the wrong list. The fix pairs the rule with the code that renders it: `categoryKindFor` and `categoryIdsFor` in `money/entries/types.ts`, now used by `formCategories`, `setDirection` and the seed alike. The seed cannot use `formCategories`: at `openAdd` time `form.direction` still holds the previous form's value, so it derives from `BLANK_ENTRY.direction`.

## 2. The first `lastUsed` write never reached the open tab

The provider mirrored a write only into a row it already held (`findIndex(...); if (i >= 0)`), but the server creates the row when none exists. Save an entry, reopen the drawer: still empty. Reload: works. With the table at zero rows this was the state of every field, so it was the first thing anyone would hit.

The old comment defended not guessing the mode, which was right. The gap was that the server had already decided and did not say so. `rememberFormValues` now returns the rows it wrote, the route passes them through, and `mergeRememberedRows` (pure, in `lib/formDefaults/merge.ts`) applies them, appending rows the client has never seen.

## Tests

Both fixes are pinned by tests. This closed a gap: the earlier phases were only ever verified by throwaway scripts. These are pure functions, so there is no excuse for not testing them.

| File                                            | Covers                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------- |
| `money/entries/__tests__/entryDefaults.test.ts` | Seedable ids are the ids the dropdown offers, for both directions |
| `lib/formDefaults/__tests__/merge.test.ts`      | An unseen row is added; a `fixed` row is left alone               |

Verified: both reproductions were re-run green against the live database (the INCOME category now dropped, the write reported back, a `fixed` field still ignored, the tab updating with no reload), and the database was left at zero rows. The new tests were re-run against the old code to confirm they catch it: 4 failures, then 120 of 120 passing on the fix. Plus `tsc`, eslint with 0 issues, and build.

## Left open deliberately

Raised in review and not fixed here:

- `useTransferDrawer` never calls `remember`, so the Last-used toggle that the Settings page offers on the transfer accounts does nothing. Fixed in [the wiring test entry](2026-09-02-form-defaults-wiring-test.md).
- `useFormDefaults` returns a `loaded` flag no form reads. Resolved in [the ready-gate entry](2026-09-03-form-defaults-ready-gate.md).
- The plan document still describes the pre-implementation API. Also resolved there.
