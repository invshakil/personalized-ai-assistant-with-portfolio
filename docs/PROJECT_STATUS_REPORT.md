# PROJECT_STATUS_REPORT.md — sshakil.com

**Snapshot date:** 2026-07-29 · **Branch:** `main` (clean except the doc edits from this sync) ·
**Owner:** Syful Islam Shakil

> **Why this file exists.** Written at the end of a long feature run, before a break. It is the
> single-page orientation for whoever (you, or a different AI) picks this project up cold: what's
> built, how healthy the docs are, what this sync fixed, and what's still open. **Start here, then
> read `PROJECT_PLANNING.md`.**

---

## 1. Verdict

The app is **feature-complete for its current scope and in a clean, releasable state** — every planned
module except **Renovation** is built, tested where it matters, and committed to `main`. The code
follows its own conventions well (the Trip audit rated it "well-architected"). The one real problem was
**documentation drift**, not code: two whole modules (**Booking** and the **Trip Expense Manager**) had
shipped without landing in the planning doc's schema table / folder tree, the memory files, or the AI
tools reference. **This sync closed those gaps** — see §5.

---

## 2. Module inventory

| Module                  | Route(s)                                                    | Status      | Notes                                                                                  |
| ----------------------- | ----------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------- |
| Portfolio (public)      | `/`                                                         | ✅          | 7 sections + booking form + floating CTA; Tailwind/SCSS                                |
| Property Management     | `/admin/property`                                           | ✅          | Units, tenants, payments, expenses, services, one-off charges, PDF receipts            |
| Financial Tracker       | `/admin/finance`                                            | ✅          | Client income, salaries, expenses, subscriptions (rate changes + overrides), FY P&L    |
| Money Manager           | `/admin/money`                                              | ✅          | Single ledger, accounts, people & loans, CSV import, multi-currency                    |
| Trip Expense Manager    | `/admin/trips` + public `/trips/<slug>`                     | ✅          | **v2 group trips**: participants, split ledger, settlements, who-owes-whom, MYR wallet |
| Booking (consultations) | `/admin/bookings` + `/admin/settings/booking` + public form | ✅          | Google Calendar + Meet, Turnstile, WhatsApp; slot math in-repo                         |
| Solar Monitoring        | `/admin/reports/solar` + `/admin/settings/solar`            | ✅          | Read-only SolisCloud telemetry, BPDB slab tariffs, payback, weather                    |
| AI Assistant            | `/admin/ai-assistant`                                       | ✅          | Streaming chat, read + write tools (approval-gated), prompt cache, budget              |
| Reports hub             | `/admin/reports`                                            | ✅          | Financial / Property / Solar                                                           |
| Settings                | `/admin/settings/*`                                         | ✅          | Site, AI (+ budget), Appearance, Backups, Solar, Booking                               |
| Backups                 | `/admin/settings/backup`                                    | ✅          | `pg_dump` + optional Google Drive offsite copy                                         |
| Account                 | `/admin/account`                                            | ✅          | Name + password                                                                        |
| **Renovation Tracker**  | `/admin/renovation`                                         | 🔲 **stub** | Still a `StubPage`; no `src/services/renovation/`. The one unbuilt module.             |

---

## 3. Codebase at a glance (verified 2026-07-29)

| Metric              | Count | Source of truth                                                                               |
| ------------------- | ----- | --------------------------------------------------------------------------------------------- |
| Prisma models       | 58    | `prisma/schema.prisma` (`grep -c '^model '`)                                                  |
| Prisma enums        | 21    | `grep -c '^enum '`                                                                            |
| Migrations          | 25    | `prisma/migrations/`                                                                          |
| Service domains     | 10    | `src/services/` (admin, ai, booking, finance, money, property, solar, solis, trips, \_shared) |
| API route handlers  | 127   | `find src/app/api -name route.ts`                                                             |
| Admin feature dirs  | 10    | `src/app/(admin)/admin/`                                                                      |
| AI tools            | 98    | 48 read (`tools.ts`) + 50 write (`writeTools/`)                                               |
| Service test suites | 5     | `src/**/__tests__/*.test.ts` (`npm run test` / `test:money` / `test:booking`)                 |

**AI tool scopes** (per-module tool budgets; the model sees one scope at a time + `shared`):
`/property` 40 · `/finance` 33 · `/money` 19 (incl. 3 Trip read tools) · `/solar` 9 · `all` 98.
Warn threshold is 80 tools/scope, so there's plenty of headroom.

---

## 4. Documentation ↔ code health

| Doc / memory                                       | Covers                             | State after this sync                                                                                                                |
| -------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/PROJECT_PLANNING.md`                         | Living master doc                  | ✅ current — Booking section + trip v2 + schema rows + folder tree + progress log + what's-next all updated                          |
| `docs/PROJECT_STATUS_REPORT.md`                    | This snapshot                      | ✅ new                                                                                                                               |
| `docs/AI_TOOLS_REFERENCE.md`                       | AI tool catalog + strategy         | ✅ current — added Money + Trip read tables, fixed footprint (66→98), `writeTools/` path                                             |
| `docs/SERVICE_LAYER.md`                            | Property service-layer conventions | ⚠️ property-only; still accurate for what it covers, but never generalized to the other 9 domains (see §6)                           |
| `docs/FINANCIAL_TRACKER.md`                        | Finance domain model               | ✅ accurate                                                                                                                          |
| `docs/TRIP_MANAGEMENT_AUDIT.md`                    | Trip module audit + resolutions    | ✅ accurate (findings #1–#7 fixed, #8 deferred)                                                                                      |
| `docs/AI_ENGINEERING_LEARNING_PROGRESS.md`         | Personal AI-eng learning notes     | ⚠️ snapshot numbers slightly behind (says "largest scope 37" / read-only→write); intentionally a point-in-time journal, low priority |
| `README.md`                                        | Public-facing overview             | ✅ current — added Money/Trips/Booking highlights, model count 41→58, folder tree, scripts, doc list                                 |
| `CLAUDE.md` / `AGENTS.md` / `CODING_CONVENTION.md` | Standards for contributors/agents  | ✅ current — env table + Turnstile, types list, currency-picker rule, shared-hooks + public-surface conventions added                |
| Memory (`~/.claude/.../memory/`)                   | Cross-session facts                | ✅ Trip memory rewritten to v2, new Booking memory, index + AI-seam line refreshed                                                   |

---

## 5. What this sync fixed (2026-07-29)

The gaps found, all now closed — **no application code was changed**, only docs/memory:

1. **Booking module was 100% undocumented** (shipped 2026-06-23). Added: a PROJECT_PLANNING module
   section, 3 schema rows (`BookingSettings`/`BookingBlackout`/`Booking`), folder-tree + README entries,
   a README highlight, and a new `project_booking_module.md` memory.
2. **Trip memory was stale v1.** The memory file still described "a trip is a tag over the money ledger";
   rewrote it to the shipped **v2 group model** (participants, split ledger, settlements, who-owes-whom).
3. **AI_TOOLS_REFERENCE was missing Money + Trip read tools** and reported **66 tools** (actual **98**).
   Added both tool tables, corrected the footprint + per-scope counts, and fixed the stale
   `writeTools.ts` → `writeTools/` path and the `domain` union.
4. **Two env vars were undocumented** — `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` (public booking
   captcha). Added to `.env.example` + the CLAUDE.md env table, plus a note that the Google OAuth client
   is **shared** by Drive backups and Booking Calendar (two APIs, two redirect URIs).
5. **Stale PROJECT_PLANNING scaffolding** — header date (2026-06-24 → 2026-07-29), folder tree (missing
   money/trips/booking/solar/solis services, `store/`, `hooks/`, per-module types), a "what to build next"
   list that still listed Property/Finance as TODO, and a progress log missing every 2026-07 feature.
6. **MEMORY.md index** never listed the Trip memory and described the AI seam as "read-only tool use"
   (write tools with an approval gate have existed since 2026-06-18). Both fixed.

---

## 6. Open items & tech debt

None of these block anything; ordered by value.

1. **Renovation Tracker** — the only unbuilt admin module (`StubPage`). Mirror the Financial Tracker
   pattern; source data `House_Rebuilding_Construction.xlsx` (৳12,500,000).
2. **Booking admin pages aren't decomposed** — `BookingSettingsPage.tsx` (~599 lines) and
   `BookingsPage.tsx` (~297) don't follow the orchestrator+hooks+components split the 300-line rule
   requires. Split before extending. (Only known convention violation in the codebase.)
3. **Trip audit item #8 (deferred)** — decide whether a `CLOSED` trip should freeze its ledger or allow
   late corrections, then guard (or intentionally don't) in `expenses.ts`/`settlements.ts`.
4. **`SERVICE_LAYER.md` is property-only** — it documents the service-layer contract using Property as the
   example but was never generalized. The contract itself is followed by all 10 domains; consider
   renaming/expanding it to a generic "Service layer" doc, or note it's illustrative.
5. **Deploy to DigitalOcean** — not yet deployed. On the host, set `TURNSTILE_*` and register the Booking
   Calendar OAuth redirect alongside the existing Drive one.
6. **AI next frontier** — OpenAI/Gemini adapters, persisted write-action cards, tool retrieval (tier 3)
   when a scope crosses ~80 tools. See `AI_TOOLS_REFERENCE.md` §8.

---

## 7. Orientation for a returning developer / new AI

Read in this order:

1. **`CLAUDE.md`** (+ `@AGENTS.md`, `@CODING_CONVENTION.md` it pulls in) — stack, file locations, DO-NOTs,
   the orchestrator+hooks+components rule, and the "this is NOT the Next.js you know" warning.
2. **This file** — where things stand.
3. **`docs/PROJECT_PLANNING.md`** — architecture, the full 58-model schema summary, every module, the
   progress log, and what to build next.
4. Domain deep-dives as needed: `FINANCIAL_TRACKER.md`, `AI_TOOLS_REFERENCE.md`, `TRIP_MANAGEMENT_AUDIT.md`.
5. Cross-session facts live in the **memory** folder (loaded via `MEMORY.md`).

**Ground rules that bite if ignored:** services (`src/services/<domain>/`) are the single source of truth
for both API routes and AI tools; client components call `src/lib/api/` (typed Axios), never `fetch()`;
Tailwind only in portfolio, MUI `sx` only in admin; the AI provider/model/key resolve at runtime via
`getActiveProvider()`; local schema changes go through `scripts/apply-migration.ts` (the local DB has no
migration baseline — P3005). When you touch a list page or add a filter, keep the matching AI tool in
lockstep (`CODING_CONVENTION.md` → List page filter standard).
