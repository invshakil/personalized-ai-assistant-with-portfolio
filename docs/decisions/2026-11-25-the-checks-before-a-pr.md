# The checks before a PR (#19)

**Before a PR, all of these pass: `check:no-js`, `check:docs-entries`, lint, typecheck, test, build and `audit:high`. A PR leaves 0 lint warnings in any file it changes, by its last commit** (Shakil, 25 Nov 2026).

- **Why:** CI ran lint, the format check and the typecheck only, so a broken build or a failing test could deploy. `npm audit` showed 4 critical and 8 high advisories that no check had flagged.
- Until the tooling PR adds the scripts, the list in `AGENTS.md` uses the npm commands that exist today. The CI PR then runs the same list on every PR.
