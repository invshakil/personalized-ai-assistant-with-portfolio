# main is the only long-lived branch (#19)

**`main` stays production and deploys on every push; there is no `dev` branch. Each piece of work is one branch from `main` and one PR into `main`, and nobody pushes to `main` directly** (Shakil, 25 Nov 2026).

- **Why:** one maintainer and one environment. An integration branch would add a release PR to every change without a second place to test it.
- **Instead of:** a `dev` integration branch with release PRs into `main`, as CT Admin has.
- Until this decision, 295 of the 313 first-parent commits on `main` were direct pushes.
- Branch protection is proposed in the CI PR and applied only after Shakil approves the exact settings.
