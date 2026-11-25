# Form defaults: plan and decisions

**Form dropdown defaults are stored per form and field in a keyed table, with accounts fixed and categories following the last one used** (Shakil, 2 Sep 2026).

- **Why:** the defaults already existed and were arbitrary. Seven call sites pre-selected whatever sorted first (`accounts[0]`, `categories[0]`, `sources[0]`, `employees[0]`). On the owner's database that meant a historical account was pre-selected every time the Add Entry drawer opened for a personal expense.

This is entry D1 of the form defaults work stream. The spec is `docs/FORM_DEFAULTS_PLAN.md`.

Decisions made:

| Decision                                                  | Reason                                                                                                               |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A keyed `FormDefault` table, not a singleton with columns | The set of defaultable fields grows with every new dropdown. A fixed-column model needs a migration each time        |
| Accounts are `fixed`, categories are `lastUsed`           | Confirmed by the owner on 2 Sep 2026. Money comes from the same wallet; categories repeat in runs and then move on   |
| The mode is stored per row, seeded from the registry      | The table and hook are the same either way. Only the write location differs, so supporting both costs almost nothing |
| A declared registry, not discovery                        | The settings page must be able to list what is defaultable without guessing what a scope means                       |
| Two entry points: an inline pin and a central page        | Different moments: you decide at the dropdown, you review in Settings                                                |
| Scope ids are form ids, never routes                      | Routes move. A default must survive that                                                                             |

Rules:

1. Defaults apply when a form opens to add, never when it opens to edit. This is the only way the feature can corrupt data.
2. Validate against the live options at the point of use. A deleted account degrades to an empty field, never a stale id sent to the API. This is the same rule as [Commit-time validation hardening](2026-08-30-commit-time-validation.md).
3. A default is a starting value, not a constraint.
4. This never changes server behaviour. It fills a form the user then submits.
