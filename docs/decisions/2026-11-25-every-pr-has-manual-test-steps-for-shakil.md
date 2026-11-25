# Every PR has manual test steps for Shakil (#19)

**Every PR reported ready has "Manual test steps for Shakil": the URL path, which local login, numbered steps, what he should see, what must not happen, and the records to use. Anything that saves uses only `zz-test-` records. A docs or tooling PR with no change under `src/` gets terminal steps instead** (Shakil, 25 Nov 2026).

- **Why:** merging deploys, and there is no staging server. The manual test on a local production build is the last check before production.
- Steps that stay useful go in a new file in `docs/manual-tests/`, in the same PR.
- The ready report opens with five lines: what changed, decision needed, blocked or risky, manual test in 5 steps or fewer, next step. It ends with "Local cleanup: done".
