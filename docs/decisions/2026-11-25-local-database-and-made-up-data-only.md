# Local database and made-up data only (#19)

**Development and tests never use the production database or the droplet. Fixtures, seeds, docs, PR bodies and screenshots use made-up data: no real amounts, balances, account names, tenants or clients. Secrets are never committed** (Shakil, 25 Nov 2026).

- **Why:** the repo is public, and git history and PR edit history keep what is removed later. A PR body had quoted real balances.
- Agents never touch the droplet, the production database or the deploy, and ask before deleting a branch, changing a GitHub setting or changing the repo's visibility.
