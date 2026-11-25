# Manual tests

Shakil's guide for checking by hand what's on `main`. Each test is its own file in [docs/manual-tests/](manual-tests/): `ls docs/manual-tests`.

There's no list of them here to keep up to date, and no tests go in this file. The rule is in [AGENTS.md](../AGENTS.md#decisions-manual-tests-and-status).

## Start here

- [Running the site](manual-tests/guide-running-the-site.md)
- [Logins and records](manual-tests/guide-logins-and-records.md)

## Adding a test

Each PR's own steps go in its ready report, in the format in [CONTRIBUTING.md](CONTRIBUTING.md#manual-test-steps). Steps that stay useful after the merge also go in a new file here, in the same PR. Never edit someone else's test: add a new file that says what changed.

**File name:** what it tests, in lowercase words and hyphens, with no number. For example, `ledger-export.md`.

## Template

```md
# <What it tests> (#<PR>)

<Signed in with the local admin login, or signed out.> <Read-only, or what it saves.>

1. **<Step>:** on `<URL path>`, <do this>. You should see <this>.
2. ...

- **Must not happen:** <the thing that would be wrong>.
- **Records:** <none are changed, or which `zz-test-` record to use>.
```
