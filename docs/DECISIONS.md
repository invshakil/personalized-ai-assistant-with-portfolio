# Decisions

Each decision is its own file in [docs/decisions/](decisions/). Newest first: `ls -r docs/decisions`.

There's no list of them here to keep up to date, and no entries go in this file. The rule is in [AGENTS.md](../AGENTS.md#decisions-manual-tests-and-status).

## What goes in a decision file

Add one when you make a choice someone might later question. Say what was decided, who decided it and when, why, and the PR it came with. To change a decision, add a new file that names the one it replaces: never edit someone else's entry.

## File name

`YYYY-MM-DD-short-slug.md`: the date the decision was made, then lowercase words and hyphens that say what it decided. For example, `2026-11-25-main-is-the-only-long-lived-branch.md`.

## Template

```md
# <What was decided> (#<PR>)

**<The decision, in one sentence>** (<who decided>, <date>).

- **Why:** <what made this the right choice>.
- **Instead of:** <what was turned down, if someone might ask>.
- **Replaces:** <a link to the older decision file, if it changes one>.
```

## Entries from before 25 Nov 2026

Entries dated before 25 Nov 2026 were moved here from `docs/PROJECT_PLANNING.md` and `docs/IMPLEMENTATION_LOG.md`, which no longer exist. They record what was built and why, and have no PR number in the title. The files they came from: `git show 4a0e763:docs/PROJECT_PLANNING.md`.
