# Testing

The data rules are in [AGENTS.md](../AGENTS.md#data): local database only, made-up data only, never production.

## The tests

There is no Jest or Vitest. Tests use Node's own runner, `node:test`, through `tsx`, and live in `__tests__/` folders next to the code they test.

| Command                | What it runs                                 |
| ---------------------- | -------------------------------------------- |
| `npm test`             | Every `src/**/*.test.ts`, one file at a time |
| `npm run test:money`   | The Money Manager scenarios only             |
| `npm run test:booking` | The Booking service tests only               |

Run one file with `node --import tsx --test <path>`.

There are three kinds:

- **Pure unit tests,** with no database: `src/lib/__tests__/`, the parsers, the calculator, slot maths, tariff maths, export totals.
- **Service tests on the local database:** money, finance, property, trips, booking. They create their own rows, tagged with a unique prefix, and delete them afterwards.
- **Wiring tests,** which read source files to hold a convention: `numberInputs.wiring.test.ts` fails if a `<TextField type="number">` comes back, and the form-defaults wiring test checks both halves of each account pair.

### The local database

Service tests use the database in `DATABASE_URL`, from `.env.local`. It must be a local PostgreSQL database. **Check it before you run tests on a machine you didn't set up.**

- **Test files run one at a time** (`--test-concurrency=1`). They share the database, and in parallel they interfere with each other.
- **Don't run tests while a dev server is open on the same database,** if the test touches rent or payments: the server can generate rows mid-test.
- **A test deletes only what it tagged.** Give new test rows a unique tag in their name, and delete in an order that respects the foreign keys: children before parents.

### Writing a test

- Put it in `__tests__/` next to the code, named `<what>.test.ts`.
- Use made-up names and amounts. Never copy a row from a real database into a fixture.
- A service test cleans up in `after`, and again at the start, so an interrupted run doesn't break the next one.
- A public serializer has a test that its private fields don't appear.

### Known problems

- **`generatePayments` is not scoped to a tenant.** The voucher and one-off-charge tests call it for far-future months, so each run creates rent rows for every active tenant in the local database, and would apply any pending rent change. Those rows are not cleaned up. The fix is a tenant filter for tests, or a throwaway test database: see [STATUS.md](STATUS.md).
- **No test checks which database it's on.** Keep `DATABASE_URL` local.

## AI evals

Every AI feature built into a page has two guards: a pure unit test of the code that checks the model's answer, and an eval script that calls the real API.

- `npm run eval:categorize` is the reference: `scripts/eval-categorize.ts`.
- An eval costs money and needs a provider key, so it isn't part of `npm test` and doesn't run in CI. Run it when you change a prompt, a model or the checking code.

## Manual testing

Shakil checks each PR by hand before he merges it. The format of the steps is in [CONTRIBUTING.md](CONTRIBUTING.md#manual-test-steps), and the tests that stay useful are in [docs/manual-tests/](manual-tests/).

- **Where:** a local production build on the local database. See [running the site](manual-tests/guide-running-the-site.md).
- **Login:** the local admin login. See [logins and records](manual-tests/guide-logins-and-records.md).
- **Records:** anything a test saves is a `zz-test-` record: a tenant named `zz-test-tenant`, a booking under `zz-test-booking`. Delete it when the test is done.
- **Never** test on sshakil.com with data that saves, and never sign in to the droplet to test.

## What CI runs

Lint, the format check and the typecheck. Tests, the build and the audit are run by hand before each PR, until CI runs them: see [STATUS.md](STATUS.md#standards-rollout).
