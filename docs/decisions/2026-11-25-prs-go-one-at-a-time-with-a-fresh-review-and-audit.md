# PRs go one at a time, with a fresh review and audit (#19)

**Shakil's Claude Code PRs go one at a time: the next isn't opened, built or pushed until the current one is merged. He merges with a merge commit, after green CI, a `/review` in a fresh session, an `/audit` in a fresh session for any code PR, and his own manual OK** (Shakil, 25 Nov 2026).

- **Why:** a review by the session that wrote the code agrees with itself. A fresh session reads the code without the author's reasons. One PR at a time keeps each review small and each deploy traceable to one change.
- The agent that wrote a PR doesn't run its review or audit, and leaves the branch alone while they run.
- A docs-only PR needs the review only.
