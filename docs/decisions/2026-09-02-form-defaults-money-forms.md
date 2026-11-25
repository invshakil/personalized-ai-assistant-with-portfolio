# Form defaults phase 2: Money forms

**Form defaults are applied when a form opens to add and nowhere else, and every `accounts[0]` fallback in the Money module was deleted** (Shakil, 2 Sep 2026).

This is entry D3 of the form defaults work stream. Three forms were wired:

| Form                    | Hook                                       | Fields                                |
| ----------------------- | ------------------------------------------ | ------------------------------------- |
| Add Entry               | `money/entries/hooks/useEntryDrawer.ts`    | account (fixed), category (lastUsed)  |
| Transfer                | `money/entries/hooks/useTransferDrawer.ts` | from account, to account (both fixed) |
| Record Payment (People) | `money/people/hooks/usePersonDetail.ts`    | account (fixed)                       |

`useTransferDrawer` gained an `accountIds` argument so it can drop a stale default. `EntriesPage` passes it through a `useMemo`, since a new array identity on each render would defeat the check.

The rule that shapes the diff: defaults are applied in `openAdd` and nowhere else. `openEdit` seeds from the record. The deposit deep-link (`?deposit=<accountId>`) still wins over any default: an explicit intent from another page outranks a stored preference.

Not wired at this point: the Property, Finance and Trips forms. The registry lists only what is actually connected, so Settings does not show a default that does nothing. Since then they have been wired: the registry now has scopes for Property, Finance and Trips forms.

Verified: `tsc`, eslint (0 errors), build, 110 of 110 tests, plus the 11 live-database checks from [phase 1](2026-09-02-form-defaults-plumbing.md). No `accounts[0]` remains anywhere under `admin/money`.
