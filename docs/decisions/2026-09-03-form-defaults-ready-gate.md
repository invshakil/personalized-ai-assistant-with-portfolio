# Form defaults: buttons wait until the data has loaded

**The Ledger's Add Entry and Transfer buttons stay disabled until the accounts, categories and stored defaults have loaded** (Shakil, 3 Sep 2026).

- **Why:** both drawers seed once, on open, and never re-seed. A drawer opened too early silently drops every default, with no recovery.

This is entry D7 of the form defaults work stream. It closes the last two items from the [code review](2026-09-02-form-defaults-review-two-fixes.md).

## The unread `loaded` flag was covering a real race

`useFormDefaults` returned `loaded` and no form read it, which looked like dead API surface. It was not. On the Ledger page the Add Entry and Transfer buttons render outside the `data.loading` guard, so both were clickable while the accounts, categories and stored defaults were still in flight. Open a drawer in that window and it seeds from empty lists. Every default is silently dropped, since `seed` correctly treats a value absent from the live options as stale.

The buttons now wait: `formsReady = !data.loading && entryDrawer.defaultsLoaded`.

Gating on the fetch state rather than on `accounts.length > 0` matters. An install with no accounts yet is a legitimate state, and a length check would disable Add permanently.

## Plan document reconciled

`FORM_DEFAULTS_PLAN.md` still described the pre-implementation API: `useFormDefaults(scope, availableOptions)` returning `defaults.values`, a `DefaultableField` with no `mode` or `hint`, and a section proposing `lastUsed` as a deferred maybe. All three shipped differently.

The document now carries the shipped signatures, a status line, phase ticks, and the two rules that came out of building it:

- The list passed to `seed` must be exactly what the dropdown renders.
- Registering a field is only half the wiring.

Verified: `tsc`, eslint with 0 issues, build, 125 of 125 tests.
