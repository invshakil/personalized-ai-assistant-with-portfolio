# Contributing

Two files in the repo root give coding agents their rules:

- [AGENTS.md](../AGENTS.md) is the single source of the shared rules, for Codex, Claude Code and people. Change a shared rule there.
- [CLAUDE.md](../CLAUDE.md) follows `AGENTS.md`, and adds only Claude Code's commands and notes.

This file has the detail behind those rules.

## Workflow

The branch and PR rules are in [AGENTS.md](../AGENTS.md#branches-and-prs). `main` is production and deploys on every push, so every change reaches it through a PR.

```sh
git fetch origin
git checkout -b fix/short-name origin/main
```

Name the branch `type/short-name`, with the same types as commit messages. Open the PR with the template. **A docs-only PR needs the review only;** the audit is for PRs that change code.

### From push to merge

Shakil's Claude Code PRs go one at a time:

1. Run the [checks](#checks), push, and wait for CI.
2. Report the PR ready, in the [report format](#the-ready-report).
3. Shakil runs `/review`, and `/audit` for code, each in a fresh session, and pastes the results. One fix round, unless there's a blocker.
4. Shakil runs the manual test steps and says OK.
5. Shakil merges, with a merge commit. Only then does the next PR get built and pushed. Planning it meanwhile is fine.

### The ready report

It opens with five lines, then the steps, then the cleanup line:

```md
- **What changed:** <one or two sentences>
- **Decision needed:** <the choice that is Shakil's, or "none">
- **Blocked or risky:** <what could go wrong on merge, or "nothing">
- **Manual test:** <5 steps or fewer, in a line>
- **Next step:** <what happens after the merge>

## Manual test steps for Shakil

...

Local cleanup: done
```

### Manual test steps

Every PR reported ready has this section, so Shakil can check the change himself:

```md
## Manual test steps for Shakil

**<what is being checked>**: `<URL path>`, <signed in with the local admin login | signed out>

1. <Do this.> You should see <this>.
2. ...

- **Must not happen:** <the thing that would be wrong>.
- **Records:** <read-only, or which zz-test- record to use>
```

- **Login:** the local admin login, from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in your untracked `.env.local`. Never a production login.
- **Records:** anything that saves uses only `zz-test-` records, on the local database. See [TESTING.md](TESTING.md#manual-testing).
- **Speed and loading:** judge them only on a production build (`npm run build`, then `npm start`). `npm run dev` compiles each page on first visit, so it's slow and shows blank moments that production doesn't.
- **A docs or tooling PR with no change under `src/`** gets terminal steps instead: the commands to run and what they should print.
- Steps that stay useful go in a new file in [docs/manual-tests/](manual-tests/), in the same PR. [MANUAL_TESTS.md](MANUAL_TESTS.md) has the naming rule and the template.

### Where it runs

`sshakil.com` runs `main`. A push to `main` starts the deploy in `.github/workflows/deploy.yml`, which builds on the droplet and restarts the app. There is no staging server: the local production build is where a change is checked before it merges.

Never deploy by hand, and never sign in to the droplet to test: see [AGENTS.md](../AGENTS.md#data).

### What is enforced today

[STATUS.md](STATUS.md#standards-rollout) lists which rules a tool enforces and which are only agreed. Please hold to the agreed ones anyway.

## Checks

Run these before you push. The list and the lint rule are in [AGENTS.md](../AGENTS.md#checks-before-a-pr).

| Check     | Run it locally                            | Notes                                                  |
| --------- | ----------------------------------------- | ------------------------------------------------------ |
| Lint      | `npm run lint`                            | Fails on errors; see [Lint](#lint)                     |
| Typecheck | `npx tsc --noEmit`                        | The build skips it, so this is the only type check     |
| Format    | `npm run format:check`                    | `npm run format` fixes it                              |
| Tests     | `npm test`                                | Needs the local database; see [TESTING.md](TESTING.md) |
| Build     | `npm run build`                           |                                                        |
| Audit     | `npm audit --omit=dev --audit-level=high` | Production dependencies, high and critical             |

Run the heavy ones at low priority, for example `nice -n 10 npm run build`.

### Lint

`npm run lint` fails on errors only. **A PR leaves 0 warnings in every file it changes.** CI doesn't check that, so run this before you push:

```sh
git diff --name-only --diff-filter=d origin/main...HEAD -- '*.ts' '*.tsx' \
  | xargs npx eslint --max-warnings 0 --no-warn-ignored
```

The warnings left on `main` are listed in [STATUS.md](STATUS.md).

### Console output

The rule is in [AGENTS.md](../AGENTS.md#no-console-output). On the server, log through the app logger:

```ts
import { logger } from "@/lib/logger";

logger.error("booking", "Calendar event could not be created", { bookingId });
```

- The first argument is the source: a short name for the area, which `/admin/logs` filters by.
- The context is cleaned before it's stored (`src/lib/logSanitize.ts`). Still, never pass a password, token, key or full request body.
- The logger never throws. Don't wrap it in a `try`.
- It imports Prisma, so it doesn't run in the browser or in edge code. There, use `console.error` with the reason:

  ```ts
  // eslint-disable-next-line no-console -- runs in the browser, where the logger can't
  console.error("Speech recognition failed", error);
  ```

## Dependencies

- Add and upgrade packages with `npm install <package>`, and commit `package-lock.json` with it.
- `next`, `eslint-config-next`, `react` and `react-dom` are pinned to exact versions. A framework upgrade is a PR of its own.
- A security fix for a transitive package goes in `overrides` in `package.json`, and only when upgrading its parent doesn't fix it.
- After any dependency change, run the audit and the build.

## Commit messages

Use `type(scope): summary` in the imperative, under about 72 characters. The scope is optional. Explain why in the body when it isn't obvious.

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `ci`.

```
fix(money): keep a payment's fee on a partial update
docs: move the planning log into decision files
```

Formatting-only changes go in their own commit.

## Data

The data rules are in [AGENTS.md](../AGENTS.md#data). Read [TESTING.md](TESTING.md) and [SECURITY.md](SECURITY.md) before you test or commit data.
