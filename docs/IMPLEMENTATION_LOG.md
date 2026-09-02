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

## Open items

| Item                                                                                        | Raised | Where       |
| ------------------------------------------------------------------------------------------- | ------ | ----------- |
| `listSessionProposedActions` written but never called — approval cards still lost on reload | A2     | AI phase 0b |
| `byFeature` in the usage payload with no UI panel                                           | A2     | AI phase 0b |
| Solar reports never visually verified (no browser tool; page is auth-gated)                 | A6     | —           |
| This work sits on `fix/write-integrity-audit`, a branch about a different topic             | A2     | —           |
