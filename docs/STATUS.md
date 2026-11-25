# Status

The current state of sshakil.com. Keep this file current: change it when the state changes. It is not a log. History goes in [decisions/](decisions/), one file per decision. How the project is built is in [ARCHITECTURE.md](ARCHITECTURE.md).

Last checked against the code: 2026-11-25.

## Where we are

Every planned module except Renovation is built and deployed. The site runs on the DigitalOcean droplet, and a push to `main` deploys it.

| Measure            | Count     | How to check                                                |
| ------------------ | --------- | ----------------------------------------------------------- |
| Prisma models      | 63        | `grep -c '^model ' prisma/schema.prisma`                    |
| Prisma enums       | 22        | `grep -c '^enum ' prisma/schema.prisma`                     |
| Migrations         | 36        | `ls prisma/migrations`                                      |
| API route handlers | 139       | `find src/app/api -name route.ts`                           |
| Test files         | 25        | `find src -name '*.test.ts'`                                |
| AI tools           | about 100 | `src/services/ai/tools.ts` (read) and `writeTools/` (write) |

## What is built

| Module            | Route                                                            | Service folder                               | Notes                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Portfolio         | `/`                                                              | `src/services/admin/` (site settings)        | Hero, Skills, Experience, Projects, Testimonials, booking form, Contact; sitemap, robots, JSON-LD                                                      |
| Overview          | `/admin`                                                         | `src/services/admin/overview.ts`             | Live cross-domain snapshot and AI spend                                                                                                                |
| Property          | `/admin/property`                                                | `src/services/property/`                     | Units, tenants, payments, expenses, services, payees, service types, settings, one-off charges, vouchers, rent changes, documents, PDF receipts        |
| Financial Tracker | `/admin/finance`                                                 | `src/services/finance/`                      | Earnings, salaries, expenses, subscriptions with rate changes and overrides, client and employee profiles, conversion and exchange, CSV and PDF export |
| Money Manager     | `/admin/money`                                                   | `src/services/money/`                        | Ledger, accounts, account types, people and loans, categories with merge, CSV import with AI categories, transfers with fees, ledger export            |
| Trips             | `/admin/trips`, public `/trips/<slug>`                           | `src/services/trips/`                        | Group trips: participants, split ledger, settlements, who owes whom, trip wallet, public cost guide                                                    |
| Bookings          | `/admin/bookings`, `/admin/settings/booking`, public form on `/` | `src/services/booking/`                      | Google Calendar and Meet, Turnstile, honeypot, rate limit                                                                                              |
| Solar             | `/admin/reports/solar`, `/admin/settings/solar`                  | `src/services/solar/`, `src/services/solis/` | Read-only SolisCloud telemetry, slab tariffs, payback, weather                                                                                         |
| Reports           | `/admin/reports/financial`, `/property`, `/solar`                | each domain's `reports.ts`                   | `/admin/reports` redirects to the financial report                                                                                                     |
| AI Assistant      | `/admin/ai-assistant`                                            | `src/services/ai/`                           | Streaming chat, read tools, write tools behind an approval gate, saved conversations                                                                   |
| AI Settings       | `/admin/settings/ai`                                             | `src/services/ai/`                           | Provider, model, encrypted key, monthly budget, prepaid credit                                                                                         |
| Site Settings     | `/admin/settings`                                                | `src/services/admin/siteSettings.ts`         | Availability, tagline, bio, CV URL                                                                                                                     |
| Appearance        | `/admin/settings/appearance`                                     | `src/services/admin/themeSettings.ts`        | Mode, primary colour, shadows, radius, density, font size                                                                                              |
| Form Defaults     | `/admin/settings/defaults`                                       | `src/services/admin/formDefaults.ts`         | Wired in Money, Property, Finance and Trips forms                                                                                                      |
| Backups           | `/admin/settings/backup`                                         | `src/services/admin/backup.ts`               | `pg_dump`, schedule, retention, optional Google Drive copy, guided restore                                                                             |
| Logs              | `/admin/logs`                                                    | `src/services/admin/logs.ts`                 | Application log with filters; pruned on a schedule                                                                                                     |
| Account           | `/admin/account`                                                 | `src/services/admin/account.ts`              | Display name and password                                                                                                                              |
| Login             | `/admin/login`                                                   | `src/lib/auth.ts`                            | Credentials, rate-limited, sliding 24-hour session                                                                                                     |

## What is not built

- **Renovation Tracker** (`/admin/renovation`). The page is a `StubPage`. There is no `src/services/renovation/` and no API. The `RenovationItem` model exists in the schema and nothing reads or writes it. The plan was line items imported from the owner's construction spreadsheet, with totals by category, following the Financial Tracker pattern.
- **OpenAI and Gemini adapters.** Both providers are seeded as inactive placeholders. Only `src/services/ai/adapters/anthropic.ts` exists.
- **RAG and embeddings.** The next AI engineering lesson; not started. Lessons on tokens and cost, stateless calls, temperature, tool use and streaming are done. See [AI_ENGINEERING_LEARNING_PROGRESS.md](AI_ENGINEERING_LEARNING_PROGRESS.md).
- **Embedded AI beyond CSV categorisation.** The remaining phases are in [AI_FEATURE_INTEGRATION_PLAN.md](AI_FEATURE_INTEGRATION_PLAN.md).

## Open items and tech debt

None of these block anything. Roughly in order of value.

1. **Build the Renovation Tracker.** See above.
2. **Approval cards are lost on reload.** `listSessionProposedActions` in `src/services/ai/proposedActions.ts` is written and never called. Proposals are saved, but the assistant page does not load pending ones back.
3. **Per-feature AI spend has no screen.** `getUsageSummary()` returns `byFeature`, and no page shows it.
4. **Closed trips are not frozen.** Trip audit item 8 is still undecided: should a `CLOSED` trip refuse new expenses and settlements, or allow late corrections? Nothing in `expenses.ts` or `settlements.ts` checks the status today. See [TRIP_MANAGEMENT_AUDIT.md](TRIP_MANAGEMENT_AUDIT.md).
5. **Booking admin pages are not decomposed.** `BookingSettingsPage.tsx` is over the limit, and neither it nor `BookingsPage.tsx` has `hooks/` or `components/`. Split before extending. The same goes for the other pages in the table below.
6. **`SERVICE_LAYER.md` covers Property only.** Every domain follows the contract, but the document was never widened. Rename and expand it, or say it is an example.
7. **Solar reports were never checked in a browser** after the page was split into hooks and components (1 Sep 2026). The pure functions were checked against real data; the screen was not.
8. **Tool retrieval.** If one AI scope passes about 80 tools, tools need to be retrieved rather than all sent. The largest scope is `/property`. See [AI_TOOLS_REFERENCE.md](AI_TOOLS_REFERENCE.md) section 8.
9. **`AI_ENGINEERING_LEARNING_PROGRESS.md` has old numbers.** It is a point-in-time journal. Low priority.
10. **CI does not run the tests or the build.** The Verify job runs lint, the format check and `tsc` only. The build first runs on the droplet during deploy.
11. **Live host settings to confirm.** The Turnstile keys and the Booking Calendar OAuth redirect were listed as to-do for the live host before the first deploy. This file's last check could not see the server, so confirm they are set.
12. **Property tests change rows that aren't theirs.** The voucher and one-off-charge tests call `generatePayments`, which acts on every tenant in the local database. Give it a tenant filter for tests, or run database tests on a throwaway database. See [TESTING.md](TESTING.md#known-problems).
13. **Older routes without `withApiError`.** 41 route files with a mutating handler don't use the wrapper, most of them under `src/app/api/admin/property/`. They check the session and validate in the service, but a thrown error isn't shaped.
14. **`@auth/prisma-adapter` looks unused.** Nothing under `src/` imports it. Remove it, or say why it stays.
15. **`docs/TRIP_MANAGEMENT_AUDIT.md` is still in the repo.** A comment in the public trip page points to it. Move it out with the other audit reports in a PR that may change `src/`.
16. **Real data still to decide on.** Shakil decides each item of real personal data found in the repo, its history and its PRs on 25 Nov 2026. The list is with him, not in the repo.

### Lint warnings left on `main`

`npm run lint` reports 0 errors and 6 warnings. A PR that changes one of these files fixes its warnings.

| File                                                             | Warnings                                    |
| ---------------------------------------------------------------- | ------------------------------------------- |
| `src/app/(admin)/admin/ai-assistant/AiAssistantPage.tsx`         | 2 unused variables                          |
| `src/app/opengraph-image.tsx`                                    | 1 `jsx-a11y/alt-text`                       |
| `src/app/(admin)/admin/settings/backup/BackupSettingsPage.tsx`   | 1 `no-location-assign-relative-destination` |
| `src/app/(admin)/admin/settings/booking/BookingSettingsPage.tsx` | 1 `no-location-assign-relative-destination` |
| `src/lib/api/client.ts`                                          | 1 `no-location-assign-relative-destination` |

There are also 14 `console.log`, `console.info`, `console.debug` and `console.warn` calls under `src/`, and 3 `no-explicit-any` disables in `src/services/property/tenants.ts`. The lint PR fixes them.

## Files over the size limits

A backlog list, not a plan. Limits: 300 lines for a page or orchestrator (`*Page.tsx`), 200 for a hook (`use*.ts`, `use*.tsx`), 100 for a file under a `components/` folder. Counted with `wc -l` on 2026-11-25, tests excluded. Paths are under `src/`.

### Pages over 300 lines

| File                                                               | Lines |
| ------------------------------------------------------------------ | ----- |
| `app/(admin)/admin/settings/solar/SolarSettingsPage.tsx`           | 630   |
| `app/(admin)/admin/settings/booking/BookingSettingsPage.tsx`       | 605   |
| `app/(admin)/admin/OverviewPage.tsx`                               | 584   |
| `app/(admin)/admin/settings/backup/BackupSettingsPage.tsx`         | 576   |
| `app/(admin)/admin/settings/appearance/AppearanceSettingsPage.tsx` | 342   |

### Hooks over 200 lines

| File                                                      | Lines |
| --------------------------------------------------------- | ----- |
| `app/(admin)/admin/money/people/hooks/usePersonDetail.ts` | 285   |
| `hooks/useSpeechRecognition.ts`                           | 223   |
| `app/(admin)/admin/ai-assistant/hooks/useChatStream.ts`   | 208   |

### Components over 100 lines

Shared admin components (`components/admin/`) have a 150-line limit in CODING_STANDARDS.md; they are listed here against 100 like the rest.

| File                                                                         | Lines |
| ---------------------------------------------------------------------------- | ----- |
| `components/portfolio/BookConsultation.tsx`                                  | 549   |
| `components/admin/AdminSidebar.tsx`                                          | 412   |
| `components/admin/ChatMessage.tsx`                                           | 346   |
| `components/admin/TenantDocuments.tsx`                                       | 255   |
| `components/admin/PayeeDocuments.tsx`                                        | 230   |
| `app/(admin)/admin/settings/ai/components/ProviderCard.tsx`                  | 205   |
| `components/admin/PendingActionCard.tsx`                                     | 196   |
| `app/(admin)/admin/property/payments/components/BillLineDrawer.tsx`          | 191   |
| `app/(admin)/admin/property/components/MoveTenantFields.tsx`                 | 179   |
| `app/(admin)/admin/property/units/[id]/components/FutureTenantCard.tsx`      | 161   |
| `components/portfolio/Contact.tsx`                                           | 152   |
| `app/(admin)/admin/money/people/components/ObligationCard.tsx`               | 151   |
| `app/(admin)/admin/trips/[id]/components/TripExpensesTable.tsx`              | 148   |
| `components/portfolio/Projects.tsx`                                          | 141   |
| `app/(admin)/admin/property/components/AddTenantDrawer.tsx`                  | 138   |
| `app/(admin)/admin/property/units/[id]/components/CurrentTenantCard.tsx`     | 135   |
| `app/(admin)/admin/trips/[id]/components/SettlementDrawer.tsx`               | 131   |
| `app/(admin)/admin/property/components/TenantTableRow.tsx`                   | 131   |
| `app/(admin)/admin/trips/[id]/components/SplitEditor.tsx`                    | 130   |
| `app/(admin)/admin/trips/[id]/components/TripExpenseDrawer.tsx`              | 128   |
| `app/(admin)/admin/ai-assistant/components/ChatInputRow.tsx`                 | 128   |
| `app/(admin)/admin/trips/[id]/components/FundWalletDrawer.tsx`               | 127   |
| `app/(admin)/admin/settings/ai/components/BudgetCard.tsx`                    | 124   |
| `app/(admin)/admin/property/dashboard/components/FinancialOverviewCard.tsx`  | 123   |
| `app/(admin)/admin/property/payments/components/PaymentRow.tsx`              | 122   |
| `app/(admin)/admin/property/components/MoveTenantDialog.tsx`                 | 121   |
| `components/portfolio/Hero.tsx`                                              | 118   |
| `app/(admin)/admin/property/payments/components/EditTransactionDrawer.tsx`   | 115   |
| `app/(admin)/admin/property/dashboard/components/YearlyTrendCard.tsx`        | 112   |
| `app/(admin)/admin/money/people/components/PersonDetailContent.tsx`          | 112   |
| `app/(admin)/admin/property/units/[id]/components/AddFutureTenantFields.tsx` | 111   |
| `app/(admin)/admin/property/expenses/components/ExpenseFiltersBar.tsx`       | 109   |
| `app/(admin)/admin/finance/payments/components/PaymentTableRow.tsx`          | 109   |
| `app/(admin)/admin/trips/components/TripFormFields.tsx`                      | 107   |
| `app/(admin)/admin/trips/[id]/components/ExpenseFundingFields.tsx`           | 107   |
| `app/(admin)/admin/property/payments/components/PaymentRowActionButtons.tsx` | 106   |
| `app/(admin)/admin/money/import/components/ColumnMappingForm.tsx`            | 105   |
| `app/(admin)/admin/property/tenants/[id]/components/TenantPaymentRow.tsx`    | 103   |
| `app/(admin)/admin/finance/settings/components/SettingsDrawer.tsx`           | 103   |
| `app/(admin)/admin/property/services/components/ServiceAccordionItem.tsx`    | 101   |
| `app/(admin)/admin/property/payments/components/PaymentFilters.tsx`          | 101   |
| `app/(admin)/admin/money/components/TransferDrawerFields.tsx`                | 101   |

## Standards rollout

The repo is being brought to the standard of Shakil's CT Admin project, in seven PRs, one at a time. The rules are in [AGENTS.md](../AGENTS.md) from the second PR on. A rule marked "agreed" is followed by hand until its PR lands.

| PR                      | What it brings                                                                                                                                                                                | State       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1. Security fix (#18)   | Dependencies upgraded until the audit shows 0 high or critical; tests run one file at a time                                                                                                  | Open        |
| 2. Rules and docs (#19) | `AGENTS.md` as the single source, the docs in this folder, decision and manual test files, PR template, licence                                                                               | This PR     |
| 3. Tooling              | Yarn 1, `.nvmrc`, `engines`, husky and lint-staged, and the scripts `typecheck`, `check:no-js`, `check:docs-entries`, `audit:high`, `clean`, `worktree:cleanup`, `heavy-run`, `cleanup:local` | Not started |
| 4. CI and deploy        | One checks job with tests, build and audit; pinned actions; CodeQL and Dependabot; the seed out of the deploy; branch protection, once Shakil approves the settings                           | Not started |
| 5. Lint hardening       | typescript-eslint strict, `no-console`, import order, `max-lines`, lint over the whole repo, a baseline for existing errors                                                                   | Not started |
| 6. Review and audit     | `/review` and `/audit` commands for this repo                                                                                                                                                 | Not started |
| 7. Cleanup              | One-off scripts, stale branches                                                                                                                                                               | Not started |

### What a tool enforces today

| Rule                                          | Enforced by                                                        | Today                           |
| --------------------------------------------- | ------------------------------------------------------------------ | ------------------------------- |
| Lint errors, formatting, types                | CI, on every PR and push to `main`                                 | Enforced                        |
| No push to `main` without a PR                | Branch protection                                                  | Agreed. PR 4                    |
| Tests, build and audit pass                   | CI                                                                 | Agreed, run by hand. PR 4       |
| No new JavaScript, `allowJs` off              | `check:no-js`                                                      | Agreed. PR 3                    |
| The two READMEs keep their fixed text         | `check:docs-entries`                                               | Agreed. PR 3                    |
| No `any`, no console output, file size limits | ESLint                                                             | Agreed. PR 5                    |
| 0 warnings in changed files                   | By hand: the command is in [CONTRIBUTING.md](CONTRIBUTING.md#lint) | Agreed                          |
| Heavy work takes turns with CT Admin          | `heavy-run`                                                        | Agreed, with `nice -n 10`. PR 3 |
| Commit hooks                                  | `.githooks/`: Prettier over the whole repo, then lint              | Replaced in PR 3                |

Things PR 3 and PR 7 need to know:

- `scripts/apply-migration.ts` is not a one-off: it's how a migration is applied to the local database. See [ARCHITECTURE.md](ARCHITECTURE.md#local-development).
- The droplet needs Yarn, through corepack, before the first deploy after PR 3.
- The deploy runs `npm run seed` each time. It sets the admin password from the environment again, and would re-run the property seed if the database ever held fewer than 13 units. PR 4 takes it out of the deploy.
