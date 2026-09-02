# IMPLEMENTATION_LOG.md — AI integration & form defaults

**Purpose:** the review companion. Every plan, decision and change in this work stream, dated, with
the files each one touched and how it was verified. Read this beside the diff — it explains _why_
each change exists, which the code deliberately does not repeat.

**Started:** 2026-08-30 · **Owner:** Syful Islam Shakil

> Detailed specs live in `AI_FEATURE_INTEGRATION_PLAN.md` (the AI roadmap) and
> `FORM_DEFAULTS_PLAN.md` (dropdown defaults). This file is the timeline that ties them together.

---

## Timeline

| Date       | Entry                                                       | Status     |
| ---------- | ----------------------------------------------------------- | ---------- |
| 2026-08-30 | [A1 — AI audit and plan](#a1)                               | ✅ done    |
| 2026-08-30 | [A2 — Phase 0: the provider seam's second entry point](#a2) | ✅ shipped |
| 2026-08-30 | [A3 — Phase 1: CSV import categorisation](#a3)              | ✅ shipped |
| 2026-08-30 | [A4 — Security audit](#a4)                                  | ✅ done    |
| 2026-08-30 | [A5 — Commit-time validation hardening](#a5)                | ✅ shipped |
| 2026-09-01 | [A6 — Solar reports decomposition](#a6)                     | ✅ shipped |
| 2026-09-02 | [A7 — Module-by-module AI analysis](#a7)                    | ✅ done    |
| 2026-09-02 | [D1 — Form defaults: plan + decisions](#d1)                 | ✅ done    |
| 2026-09-02 | [D2 — Form defaults phase 1: plumbing](#d2)                 | ✅ shipped |
| 2026-09-02 | [D3 — Form defaults phase 2: Money forms](#d3)              | ✅ shipped |
| 2026-09-02 | [D4 — Form defaults phase 3: the Settings page](#d4)        | ✅ shipped |
| 2026-09-02 | [D5 — Code review of D1–D4, and two fixes](#d5)             | ✅ shipped |
| 2026-09-02 | [D6 — The inert Last-used toggle, and a wiring test](#d6)   | ✅ shipped |
| 2026-09-03 | [D7 — Closing the last two review items](#d7)               | ✅ shipped |
| 2026-09-03 | [C1 — Calculator amount input](#c1)                         | ✅ shipped |

---

<a id="a1"></a>

## A1 · AI audit and plan — 2026-08-30

**Finding.** `grep getActiveProvider` returned two hits, both in `src/app/api/admin/ai/route.ts`.
101 tools, a provider-neutral seam, an approval gate and budget metering — all reachable only by
typing prose into `/admin/ai-assistant`.

**Conclusion.** Chat is right for open-ended analysis and wrong for four things the app does
constantly: classification at volume, extraction from a document, ranking known signals, and turning
intent into UI state.

**Artefact.** `docs/AI_FEATURE_INTEGRATION_PLAN.md`.

---

<a id="a2"></a>

## A2 · Phase 0 — the seam's second entry point — 2026-08-30

Commits `efdc0a8`, `128dcef`, `f6d5be4`.

| Change                                                        | Files                                                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `complete<T>()` on `AiProvider`, via `output_config.format`   | `services/ai/types.ts`, `services/ai/adapters/anthropic.ts`                |
| `runAiTask` / `tryAiTask` — resolve, meter, return typed data | `services/ai/task.ts`                                                      |
| Per-purpose model selection (`getProviderFor`)                | `services/ai/registry.ts`, `services/ai/config.ts`                         |
| Per-feature spend attribution                                 | `AiUsage.feature`, `services/ai/usage.ts`                                  |
| Persisted propose → approve → commit gate                     | `AiProposedAction`, `services/ai/proposedActions.ts`, `/ai/actions/cancel` |
| Model catalog + pricing refreshed to the Claude 5 family      | `services/ai/config.ts`, `services/ai/pricing.ts`                          |

**Decisions.**

- `tryAiTask` returns `null` rather than throwing, because AI in a feature page is an assist, not a
  dependency. A failed suggestion must degrade to "no suggestion", never a failed import.
- `AiUnavailableError` separates "the assistant is unavailable" (unconfigured, over budget) from
  "this task failed" — only the first is a cue for the caller to carry on silently.
- Classification and extraction resolve to the provider's fast model; analysis and chat keep the
  model the user chose in Settings → AI.

**Verified.** tsc, eslint, build, 104/104 tests. `output_config.format` confirmed against the live
API on SDK 0.102.

---

<a id="a3"></a>

## A3 · Phase 1 — CSV import categorisation — 2026-08-30

Commits `6dc2967`, `ca11f8f`.

Suggests a category per distinct description, few-shot prompted with the user's own last 60 filing
decisions, constrained to categories that already exist.

**Decisions.**

- **The model runs in preview only.** `commitImport` replays the reviewed map rather than calling the
  model again — a second call could categorise a row differently and the user would never know which
  answer landed.
- **The guard is separate from the call.** The JSON Schema constrains the response's shape, never its
  vocabulary, so `reconcileAssignments` drops invented categories, kind/direction mismatches, lines
  nobody asked about, and low confidence. Pure, so it is testable without spending money.

**Files.** `services/money/categorize.ts`, `services/money/import.ts`, `lib/api/money.ts`, the import
UI (`AiCategorizeToggle`, `PreviewRow`, `PreviewSummaryChips`, `useCsvFile`, `useImportPreview`).

**Verified.** 13 unit tests on the guard; `npm run eval:categorize` — 20 golden cases against the
real API. First run 18/19 (94.7%); the eval caught a real bug (see A5).

---

<a id="a4"></a>

## A4 · Security audit — 2026-08-30

Reviewed the branch as a security analyst. **No HIGH or MEDIUM vulnerabilities.** Six candidates
examined and dismissed with reasons — client-controlled category names, prompt injection via CSV
descriptions, `actionId` accepted without matching `tool`/`input`, `JSON.parse` of model output,
path traversal via `toMessageParams`, error-message disclosure through `withApiError`.

Threat model: single admin, every `/api/admin/*` route gated on `auth()`, no role-based
authorisation anywhere. A finding had to show impact reachable by an unauthenticated party.

One non-security note was raised and then fixed — see A5.

---

<a id="a5"></a>

## A5 · Commit-time validation hardening — 2026-08-30

**Gap.** The preview guard constrained what the _model_ could propose, but `commitImport` trusted
`mapping.aiCategories` verbatim — and that map comes back from the browser. Without a second pass
the guarantee held only while the client replayed it honestly, and a hand-edited request could name
a category that does not exist and have `ensureCategory` create it.

**Fix.** `validateSuggestionRecord` re-applies the category-exists and kind-matches rules on commit,
against the live category list. Shared validators (`buildValidCategories`, `canonicalCategory`) so
both passes decide the same way rather than drifting apart.

**Rule this established.** _Validate on the server at every hop the value crosses._ A guard applied
where a value is produced does not protect the path where it is applied.

**Verified.** 6 new unit tests; checked against the live database — happy path kept, forged name
blocked, kind mismatch blocked (a real INCOME category refused on a DEBIT row), same category still
accepted on the correct direction.

---

<a id="a6"></a>

## A6 · Solar reports decomposition — 2026-09-01

Commit `5db9522`. `SolarReportsPage.tsx` 847 → 108 lines: 3 hooks, 14 components, every file inside
its convention limit.

**Decisions.**

- `useSolarData` takes bounds as two primitives, not the object holding them — an object identity in
  a dependency list refetches on every render.
- `yearOptions` stays in the orchestrator: it needs the install date that only the report carries, and
  putting it in `useSolarRange` would make the range hook depend on the data hook that depends on it.
- `MetricBlock` replaced twelve copy-pasted caption-over-figure blocks; `WeatherNotice` replaced two
  near-identical dashed panels.

**Verified.** Both extracted pure functions checked against the original implementations using six
real months from the database — all 11 fields identical, `rangeBounds` identical across 6 presets.

---

<a id="a7"></a>

## A7 · Module-by-module AI analysis — 2026-09-02

Reframed the opportunity space as **six interaction patterns** rather than a feature list — Fill,
Find, Flag, Explain, Draft, Ambient — because the pattern determines the latency budget, the cost
profile and how much the output can be trusted. Five of the six never need the chat page.

**Three structural findings.**

1. **Solar** stores `SolisDailyReading` per day and reports only monthly aggregates. A failing panel
   string is invisible in a monthly total. Largest data-to-insight gap in the app.
2. **36 models** carry a `notes` / `description` / `reason` field and nothing can search them.
3. **Subscription creep** is recorded in `SubscriptionRateChange` and never surfaced as a cumulative
   figure.

**Roadmap revision.** The command bar was promoted out of "ambient" (structural, not a feature);
reports gained their own phase; voice moved to the front of Capture because
`useSpeechRecognition` (223 lines) already exists with one consumer. Phase 0b added for two pieces
built but left unwired.

---

<a id="d1"></a>

## D1 · Form defaults — plan and decisions — 2026-09-02

**Framing.** Not "add defaults" — the defaults already exist and are arbitrary. Seven call sites
pre-select whatever sorts first (`accounts[0]`, `categories[0]`, `sources[0]`, `employees[0]`). On
this database `accounts[0]` is "House Construction - Historical", pre-selected every time the Add
Entry drawer opens for a personal expense.

**Decisions made.**

| Decision                                                | Rationale                                                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Keyed `FormDefault` table, not a singleton with columns | The defaultable field set grows with every new dropdown; a fixed-column model needs a migration each time |
| **Accounts → `fixed`, categories → `lastUsed`**         | Confirmed by owner 2026-09-02. Money comes from the same wallet; categories repeat in runs then move on   |
| Mode stored per row, seeded from the registry           | Same table and hook either way — only the write location differs, so supporting both costs almost nothing |
| A declared registry, not discovery                      | The settings page must be able to list what is defaultable without guessing what a scope means            |
| Two entry points (inline pin + central page)            | Different moments: you decide at the dropdown, you review in Settings                                     |
| Scope ids are form ids, never routes                    | Routes move; a default must survive that                                                                  |

**Rules.**

1. Defaults apply on **open-add, never open-edit**. The only way this feature can corrupt data.
2. Validate against **live options at the point of use** — a deleted account degrades to an empty
   field, never a stale id sent to the API. (Same rule A5 established.)
3. A default is a starting value, not a constraint.
4. This never changes server behaviour; it fills a form the user then submits.

---

<a id="d2"></a>

## D2 · Form defaults phase 1 — plumbing — 2026-09-02

| Piece                           | File                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `FormDefault` model + migration | `prisma/schema.prisma`, `migrations/20260902000000_form_defaults/`            |
| Declared registry of fields     | `src/lib/formDefaults/registry.ts`                                            |
| Shared types                    | `src/types/formDefaults.ts` (+ barrel)                                        |
| Storage + mode enforcement      | `src/services/admin/formDefaults.ts`                                          |
| API                             | `/api/admin/form-defaults` (GET/PUT/DELETE), `/form-defaults/remember` (POST) |
| Client methods                  | `src/lib/api/admin.ts`                                                        |
| Load-once provider              | `src/components/admin/FormDefaultsProvider.tsx`, mounted in `AdminShell`      |
| Read hook with staleness check  | `src/hooks/useFormDefaults.ts`                                                |

**Decisions taken during implementation.**

- **The server decides the mode, not the client.** `rememberFormValues` looks up the effective mode
  (stored row first, registry second) and writes only `lastUsed` fields. Putting that check on the
  client would mean a stale tab could overwrite a value the user had deliberately pinned.
- **The registry is a hard gate.** `setFormDefault` throws for a scope or field that is not
  registered, so no hand-made request can invent one.
- **Rows for fields that have left the registry are filtered out on read** rather than returned —
  the field no longer exists in any form, so a value for it would only confuse the Settings page.
- **Loading never blocks a form.** A failed fetch leaves the map empty and every drawer opens exactly
  as it did before this feature existed.
- **`remember` is fire-and-forget.** The record is already saved; failing to store a convenience
  default must never surface as an error on a successful save.
- **Empty values are never remembered** — "nothing chosen" is not a default worth keeping.

**Verified** against the live database (11 checks): registry guard refuses unknown scope/field, a
`fixed` default survives being used differently, `lastUsed` records and then moves with each save,
a field switched to `fixed` stops following usage, an empty value does not clobber a stored default,
clearing removes the row, and a stale id resolves to an empty field.

---

<a id="d3"></a>

## D3 · Form defaults phase 2 — Money forms — 2026-09-02

Wired three forms and deleted every `accounts[0]` fallback in the Money module.

| Form                    | Hook                                       | Fields                                |
| ----------------------- | ------------------------------------------ | ------------------------------------- |
| Add Entry               | `money/entries/hooks/useEntryDrawer.ts`    | account (fixed), category (lastUsed)  |
| Transfer                | `money/entries/hooks/useTransferDrawer.ts` | from account, to account (both fixed) |
| Record Payment (People) | `money/people/hooks/usePersonDetail.ts`    | account (fixed)                       |

`useTransferDrawer` gained an `accountIds` argument so it can drop a stale default; `EntriesPage`
passes it via a `useMemo`, since a new array identity each render would defeat the check.

**The rule that shapes the diff:** defaults are applied in `openAdd` and nowhere else. `openEdit`
seeds from the record, and the deposit deep-link (`?deposit=<accountId>`) still wins over any
default — an explicit intent from another page outranks a stored preference.

**Not yet wired** (phase 5): Property, Finance and Trips forms. The registry lists only what is
actually connected, so Settings will not show a default that does nothing.

**Verified.** tsc, eslint (0 errors), build, 110/110 tests, plus the 11 live-database checks in D2.
No `accounts[0]` remains anywhere under `admin/money`.

---

<a id="d4"></a>

## D4 · Form defaults phase 3 — the Settings page — 2026-09-02

`Settings → Form Defaults` (`/admin/settings/defaults`). Until this landed, a default could only be
set through the API, so the observable effect of D2–D3 was a form that opened _empty_ rather than
with the wrong value.

| Piece                    | File                                                 |
| ------------------------ | ---------------------------------------------------- |
| Orchestrator (115 lines) | `settings/defaults/DefaultsSettingsPage.tsx`         |
| Option-source loader     | `settings/defaults/hooks/useDefaultOptions.ts`       |
| Field row                | `settings/defaults/components/DefaultFieldRow.tsx`   |
| Form grouping            | `settings/defaults/components/FormDefaultsGroup.tsx` |
| Nav + breadcrumb         | `AdminSidebar.tsx`, `AdminBreadcrumb.tsx`            |

**Decisions.**

- **Only the sources the registry references are fetched.** Registering a Property field later costs
  one branch in `useDefaultOptions`, not a page-wide change.
- **"— no default —" is an explicit option**, per the list-page convention that every sentinel is a
  real choice rather than an empty box. Choosing it stores `value: ""` and keeps the chosen mode;
  the separate reset button deletes the row so the field returns to the registry's starting mode.
- **The mode toggle is visible per field**, so there is no hidden state — you can see that Account is
  Fixed and Category is Last used without opening anything.
- **Registry order is display order**, and the page groups by adjacency. A registry that interleaved
  two forms would render duplicate cards, so that property is asserted in verification rather than
  left to chance.
- The page states the open-add rule in a banner, because "why didn't my default apply when I edited
  this row" is the obvious first confusion.

**Verified.** 9 checks on the page's data path: every registry source is loadable, enum fields carry
options, account and category shapes match what the page maps over (10 accounts, 46 categories),
grouping is contiguous, no registered field is unwired to a real form, and the registry lookups the
page and service share agree. Plus tsc, eslint 0 errors, build, 110/110 tests. All four files inside
their convention limits (page 115/300, hook 60/200, components 93 and 26/100).

---

<a id="d5"></a>

## D5 · Code review of D1–D4, and two fixes — 2026-09-02

Reviewed the shipped feature against this log and `FORM_DEFAULTS_PLAN.md`. The architecture held —
server-decides-mode, registry-as-hard-gate, `openEdit` never seeding, a failed fetch degrading to the
old behaviour. Two bugs, both reproduced against the live database before being fixed.

**1 — `seed()` was validated against the wrong option list.** `openAdd` checked the stored category
against _every_ category, while the drawer renders only those matching the direction's kind. A
last-used INCOME category therefore passed the check, rendered as an **empty field**
(`SearchableSelect` resolves an unmatched value to `null`) and was then refused by the server —
"A DEBIT entry needs an EXPENSE category". An error on a field that looks blank.

This was plan Rule 2 applied to the wrong list. The fix pairs the rule with the code that renders it:
`categoryKindFor` / `categoryIdsFor` in `money/entries/types.ts`, now used by `formCategories`,
`setDirection` and the seed alike. Note the seed cannot use `formCategories` — at `openAdd` time
`form.direction` still holds the _previous_ form's value, so it derives from `BLANK_ENTRY.direction`.

**2 — The first `lastUsed` write never reached the open tab.** The provider mirrored a write only
into a row it already held (`findIndex(...); if (i >= 0)`), but the server _creates_ the row when
none exists. Save an entry, reopen the drawer: still empty. Reload: works. With the table at zero
rows this was the state of every field, so it was the first thing anyone would hit.

The old comment defended not _guessing_ the mode, which was right; the gap was that the server had
already decided and did not say so. `rememberFormValues` now returns the rows it wrote, the route
passes them through, and `mergeRememberedRows` (pure, in `lib/formDefaults/merge.ts`) applies them —
appending rows the client has never seen.

**Tests.** Both fixes are pinned, closing the gap that D2–D4 were only ever verified by throwaway
scripts — the same discipline A3/A5 applied to the AI guard, for the same reason: these are pure
functions, so there is no excuse for not testing them.

| File                                            | Covers                                                          |
| ----------------------------------------------- | --------------------------------------------------------------- |
| `money/entries/__tests__/entryDefaults.test.ts` | seedable ids ≡ the ids the dropdown offers, for both directions |
| `lib/formDefaults/__tests__/merge.test.ts`      | an unseen row is added; a `fixed` row is left alone             |

**Verified.** Both reproductions re-run green against the live database (the INCOME category now
dropped, the write reported back, a `fixed` field still ignored, the tab updating with no reload) and
the database left at zero rows. The new tests were re-run against the _old_ code to confirm they
catch it: **4 failures**, then 120/120 passing on the fix. Plus tsc, eslint 0 issues, build.

**Left open deliberately** (raised in review, not fixed here): `useTransferDrawer` never calls
`remember`, so the Last-used toggle the Settings page offers on the transfer accounts does nothing;
`useFormDefaults` returns a `loaded` flag no form reads; and the plan document still describes the
pre-implementation API. See Open items.

---

<a id="d6"></a>

## D6 · The inert Last-used toggle, and a wiring test — 2026-09-02

Closes the finding D5 left open. `useTransferDrawer` seeded from its defaults but never called
`remember`, so the Fixed / Last-used toggle the Settings page renders for **From account** and **To
account** was a control that could not do anything: the transfer drawer is the only place a
transfer's account choice is ever known, and it was throwing that away.

Harmless in the shipped state — both fields start `fixed`, which ignores `remember` anyway — which is
exactly why it survived review of the diff. It only becomes wrong the moment someone uses the toggle.

**The real fix is the test, not the call.** One line restores the behaviour; the reason it was missing
is that nothing could see it was missing. D4 verified "no registered field is unwired" and passed,
because it checked `seed` and stopped there. `registry.ts` already carried the warning in a comment —
_"an entry here with no wiring shows the user a setting that does nothing"_ — and a comment cannot
fail a build.

`lib/formDefaults/__tests__/wiring.test.ts` now scans `src/app/(admin)` for `useFormDefaults("…")`
call sites and asserts, for every registered scope, that a form both **seeds** from it and
**reports back** to it — plus the reverse, that no form reads a scope the registry does not declare
(`setFormDefault` would refuse it). It is deliberately two-sided: a form that seeds and never
remembers looks correctly wired from every angle except the one that matters.

This matters most for phase 5. Property, Finance and Trips add roughly ten more fields, and each one
is the same two-sided wiring done by hand.

**Verified.** The wiring test re-run against the unwired code fails on exactly the right assertion —
`every registered scope reports what was saved` — and passes on the fix. 125/125 tests (was 120),
tsc, eslint 0 issues, build.

---

<a id="d7"></a>

## D7 · Closing the last two review items — 2026-09-03

**The unread `loaded` flag was covering a real race.** `useFormDefaults` returned `loaded` and no
form read it, which looked like dead API surface. It was not: on the Ledger page the **Add Entry** and
**Transfer** buttons render _outside_ the `data.loading` guard, so both were clickable while the
accounts, categories and stored defaults were still in flight. Open a drawer in that window and it
seeds from empty lists — every default silently dropped, since `seed` correctly treats a value absent
from the live options as stale.

Both drawers seed once, on open, and never re-seed, so there is no recovery after the fact. The
buttons now wait: `formsReady = !data.loading && entryDrawer.defaultsLoaded`.

Gating on the _fetch_ state rather than on `accounts.length > 0` matters — an install with no accounts
yet is a legitimate state, and a length check would disable Add permanently.

**Plan document reconciled.** `FORM_DEFAULTS_PLAN.md` still described the pre-implementation API:
`useFormDefaults(scope, availableOptions)` returning `defaults.values`, a `DefaultableField` with no
`mode` or `hint`, and §7 proposing `lastUsed` as a deferred maybe. All three shipped differently. The
document now carries the shipped signatures, a status line, phase ticks, and the two rules that came
out of building it — the list passed to `seed` must be exactly what the dropdown renders (D5), and
registering a field is only half the wiring (D6).

**Verified.** tsc, eslint 0 issues, build, 125/125 tests.

---

<a id="c1"></a>

## C1 · Calculator amount input — 2026-09-03

Requested: _"in the ledger input box where I type in amount, sometime I need to remember multiple
amount and add it. So I want to type like 200 + 300 + 500, input should automatically behave as
calculator."_

`AmountField` replaces the Ledger drawer's amount box. Type a sum, see the running total under the
field, and it settles on the number when you leave the field.

| Piece                        | File                                                  |
| ---------------------------- | ----------------------------------------------------- |
| Grammar + evaluator (pure)   | `src/lib/calcExpression.ts`                           |
| The input                    | `src/components/admin/AmountField.tsx`                |
| Wired into the Ledger drawer | `money/entries/components/EntryDrawerBasicFields.tsx` |

**Decisions.**

- **No `eval`, no `new Function`.** The input is a form field, so it is attacker-controlled by
  definition. A hand-written tokeniser and recursive-descent parser over
  `digits . + - * / ( )` is the whole language; anything else is rejected rather than sanitised, so
  there is no clever input to get past. The rejection tests are the security tests.
- **The parent only ever receives a resolved number.** This is the part that could have gone quietly
  wrong: `parseFloat("200 + 300")` is `200`, so a component that passed its raw text up would post
  200 the moment someone hit Save mid-expression — a plausible wrong figure, silently. Mid-expression
  the field emits `""` instead, which fails loudly on save. An unfinished sum is not an amount.
- **`type="number"` had to go.** It rejects `+` and spaces outright. The field is `type="text"` with
  its own grammar, which also means no browser spinners on a money field.
- **Results round to 2 decimals**, because these are money amounts: `0.1 + 0.2` is `0.3`.
- **The hint under the field is permanent.** It is the only cue that the box does arithmetic, and
  keeping it there holds the row height steady when the running total replaces it.
- **Errors wait for blur.** "200 +" is a normal thing to have typed a moment ago; flagging it while
  the cursor is still in the field would be noise. On blur, an unparseable value keeps its text so it
  can be corrected rather than retyped.

**Verified.** 10 unit tests on the evaluator — precedence, brackets, unary minus, float noise,
division by zero, and a rejection block covering `alert(1)`, `require('fs')`, `2 ** 8`, `1e3`,
`0x10`, `__proto__` and `1; 2`. Plus a keystroke trace of `200 + 300 + 500` asserting that every
value the parent receives equals the true sum of what has been typed so far, and that no keystroke
yields a plausible-but-wrong number. 135/135 tests, tsc, eslint 0 issues, build.

**Not wired** (offered, not assumed): the Transfer drawer's amount / destination amount / fee, and
the Property, Finance and Trips amount boxes. `AmountField` drops into any of them unchanged.

---

## Open items

| Item                                                                                        | Raised | Where       |
| ------------------------------------------------------------------------------------------- | ------ | ----------- |
| `listSessionProposedActions` written but never called — approval cards still lost on reload | A2     | AI phase 0b |
| `byFeature` in the usage payload with no UI panel                                           | A2     | AI phase 0b |
| Solar reports never visually verified (no browser tool; page is auth-gated)                 | A6     | —           |
| This whole work stream (A2–D5) was committed straight onto `main`, never a feature branch   | A2     | —           |
