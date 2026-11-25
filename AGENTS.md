# sshakil.com: rules for working in this repo

The single source of the shared rules, for Codex, Claude Code and people. Change a rule here: other docs link to it and add detail, but don't restate it. `CLAUDE.md` only adds what is specific to Claude Code.

## What this is

One Next.js app for **sshakil.com**, with two surfaces:

| Route                             | Who it's for                        | Login    | Styling            |
| --------------------------------- | ----------------------------------- | -------- | ------------------ |
| `/`                               | Public: the portfolio website       | None     | Tailwind v4 + SCSS |
| `/admin/*`                        | Private: the personal admin         | Required | Material UI v9     |
| `/admin/login`                    | The login page                      | None     | Material UI v9     |
| `/trips/<slug>`, the booking form | Public pages that read or save data | None     | Tailwind v4        |

Next.js 16 (App Router), TypeScript, Prisma 5 with PostgreSQL, NextAuth v5 (one admin, credentials, JWT sessions), deployed to a DigitalOcean droplet on every push to `main`. The repo is public.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before changing shared parts: it has the stack, file locations, data layers, theme tokens and environment variables. [docs/STATUS.md](docs/STATUS.md) says what is built and what is open.

## This is not the Next.js you know

This version has breaking changes: APIs, conventions and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## The TypeScript rule

**All code is TypeScript, strict, with no `any`.** Use `unknown` and narrow.

- No `@ts-ignore` or `@ts-expect-error` without a comment that says why.
- No new `.js`, `.jsx`, `.mjs` or `.cjs` files. Only config files a tool requires as JavaScript are allowed, and they are listed in `scripts/js-allowlist.json`.
- `allowJs` is off.

## No console output

**No `console.log`, `console.info`, `console.debug` or `console.warn` in committed code.**

- Errors and events go to the app logger: `logger` from `src/lib/logger.ts`, which writes to stdout and to the `LogEntry` table behind `/admin/logs`. It runs on the server only.
- Use `console.error` only where the logger can't run, such as in the browser or in edge code, with the reason in the comment: `// eslint-disable-next-line no-console -- <why>`.
- `scripts/` and `prisma/seed*.ts` are exempt, because those are command-line tools.

## Branches and PRs

- **`main` is production.** Every push to it deploys. There is no `dev` branch.
- **One branch per piece of work, from `main`, then one PR into `main`.** Never push to `main` directly.
- **Every PR needs green CI and a code review, and a PR that changes code also needs a security audit.** A docs-only PR needs the review only.
- **The review and the audit each run in a fresh session,** never the one that wrote the code: `/review` and `/audit` in Claude Code. With another tool, ask Shakil to run them. The agent that wrote a PR doesn't run them itself, and leaves the branch alone while they run.
- **Every PR reported ready has "Manual test steps for Shakil":** the URL path, which local login, numbered steps, what he should see, what must not happen, and the records to use: only `zz-test-` records for anything that saves. Steps that stay useful go in a new file in [docs/manual-tests/](docs/manual-tests/), in the same PR.
- **A docs or tooling PR with no change under `src/` gets terminal steps instead.**
- **Shakil merges a PR only after** CI, the review, and the audit for code, pass, and he has run the manual test and said OK. He merges with a **merge commit**.
- **Shakil's Claude Code PRs go one at a time:** don't open, build or push the next until the current one is merged. Planning it meanwhile is fine.
- **A ready report opens with five lines:** what changed, decision needed, blocked or risky, manual test (5 steps or fewer), next step. Then the full manual test steps. Then "Local cleanup: done".

The format of the steps and the path from push to merge are in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Decisions, manual tests and status

**One entry, one file,** so parallel PRs never touch the same lines.

- **Add a new file:** a decision in [docs/decisions/](docs/decisions/), a manual test in [docs/manual-tests/](docs/manual-tests/). The naming rules and templates are in [docs/DECISIONS.md](docs/DECISIONS.md) and [docs/MANUAL_TESTS.md](docs/MANUAL_TESTS.md).
- **Never edit someone else's entry.** To change one, add a new file that names the one it replaces.
- **Never append to `docs/DECISIONS.md` or `docs/MANUAL_TESTS.md`.** They are short READMEs with fixed text, and the `check:docs-entries` check fails if either one changes.
- **Current state goes in [docs/STATUS.md](docs/STATUS.md),** kept current when your change affects it. It is not a log: history goes in decision files.
- **Change `prisma/schema.prisma` only together with [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),** which has the schema summary.

## Checks before a PR

Run all of these, and they must pass:

```sh
npm run lint
npx tsc --noEmit
npm run format:check
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

**0 lint warnings in any file a PR changes,** by the PR's last commit.

The package manager and these commands change with the tooling PR: Yarn 1, Node 22, and the `check:no-js`, `check:docs-entries`, `typecheck` and `audit:high` scripts. Until it merges, use npm as above. [docs/STATUS.md](docs/STATUS.md#standards-rollout) says which of these rules a tool enforces today.

## Data

- **Never use the production database or the droplet** for development or tests. Local database only.
- **Never touch the droplet or the deploy,** and ask Shakil before deleting a branch, changing a GitHub setting or changing the repo's visibility.
- **Fixtures, seeds, docs, PR bodies and screenshots use made-up data only:** no real amounts, balances, account names, tenants or clients. The repo is public.
- **Anything a manual test saves uses a `zz-test-` record,** and is cleaned up afterwards.
- **Never commit secrets.** They go in `.env.local`, read through `process.env`. `.env.example` holds names and placeholders only.
- If a secret or real personal data is committed, tell Shakil straight away. See [docs/SECURITY.md](docs/SECURITY.md).

## Local heavy work

Shakil's Mac runs two projects at once. Heavy steps are a build, a test run or a server.

- **Run every heavy step at low priority, one at a time:** through `heavy-run` once the tooling PR adds it, and with `nice -n 10` until then.
- **Agents start servers on port 3100 only.** Port 3000 is Shakil's.
- **Never leave a server or watcher running between steps,** in the background or not.
- **Keep parallelism low.** Test files run one at a time: they share the local database.
- **Clean up before you report,** with `cleanup:local` once it exists, and end each report with "Local cleanup: done", or say what's still running and why.

## Worktrees and disk

- **Work in a second worktree only for a parallel PR.**
- **Agents run `worktree:cleanup --dry-run` at the start of each new task,** once the tooling PR adds it, and report what it would remove.
- **Run `clean` after a PR is merged.** Never delete `node_modules` mid-task.

## Where code goes

Every feature page follows **orchestrator + hooks + components**. Run this check **before** adding code to a page or component file:

1. **Is the file already over its limit?** 300 lines for a page (`*Page.tsx`), 200 for a hook, 100 for a component, 150 for a shared admin component. Extract first, then add.
2. **State, effects, API calls and derived values** go in a `hooks/use<Domain>.ts` file next to the page.
3. **UI that only needs props** goes in a `components/<Name>.tsx` file next to the page.
4. **A `components/` file never calls `fetch`, an API module or a Redux selector.** Pass data as props.
5. **Feature-specific hooks and components live next to the feature page,** not in `src/hooks/` or `src/components/admin/`. Those are for pieces at least two features use.
6. **Only `hooks/use*.ts` files dispatch to Redux.** A page may read with `useAppSelector`. A component touches Redux not at all.
7. **Server data stays in a hook's `useState`,** not in Redux. Redux holds only client state that must survive navigation, such as the open chat thread.

In one sentence: a page file wires hooks to components, and holds neither logic nor blocks of markup.

The thresholds, the directory layout and the reference module are in [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md). Files already over the limits are listed in [docs/STATUS.md](docs/STATUS.md): don't grow them.

## Do not

**Stack and structure**

- Don't change the stack without discussion: Next.js App Router, Tailwind on the portfolio, Material UI on the admin, Prisma with PostgreSQL, NextAuth credentials.
- Don't switch the login from credentials to OAuth.
- Don't add a package before checking that an installed one covers it.
- Don't add `"use client"` to a `layout.tsx` file. `AdminShell.tsx` is a separate client component, not a layout.
- Don't create a Prisma client. Import `{ db }` from `@/lib/db`.
- Don't restructure `src/lib/auth.ts`.

**The two surfaces**

- Don't use Tailwind classes in admin components. Use the `sx` prop.
- Don't use Material UI components in portfolio components. Use Tailwind.
- Don't hardcode a colour in the admin. Use the theme's palette keys.
- Don't use `<Box component="nav">` in the admin. Use `<Box role="navigation">`: the portfolio's global `nav { position: fixed }` rule reaches it.

**Admin forms and data**

- Don't use the `<form>` element in React components. Use `onSubmit` with controlled state.
- Don't use `<TextField type="number">` in the admin. Use `NumberField`: every number input is a calculator, and a test enforces it.
- Don't build your own Money account dropdown or a "payment mode" select. Use `AccountTypeAccountSelect`.
- Don't call `fetch` with an inline URL from a client component. Use the typed client in `src/lib/api/`.
- Don't put `db.*` queries in a route handler when the domain has a service in `src/services/`.
- Don't hardcode an AI provider, model or key. Resolve it with `getActiveProvider()`.

**Security**

- Don't write an admin API route without the session check at the top: `const session = await auth(); if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })`.
- Don't add inverter-control or write endpoints to `src/services/solis/`. The SolisCloud integration is read-only by design.
- Don't let an AI tool write without the approval step.
- Don't return private fields from a public page or endpoint. A public serializer is a whitelist, with a test.

## Read next

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): the stack, file locations, data layers, tokens and environment variables.
- [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md): follow these for all code.
- [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md): the PR workflow, checks and commit messages.
- [docs/SECURITY.md](docs/SECURITY.md): the security rules, known risks and how to report a problem.
- [docs/TESTING.md](docs/TESTING.md): the tests, the local database and manual testing.
- [docs/MANUAL_TESTS.md](docs/MANUAL_TESTS.md): how Shakil's manual tests work.

Add a file in [docs/decisions/](docs/decisions/) for each decision.
