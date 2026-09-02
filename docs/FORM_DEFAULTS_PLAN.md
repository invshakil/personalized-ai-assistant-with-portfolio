# FORM_DEFAULTS_PLAN.md — user-controlled dropdown defaults

**Written:** 2026-09-02 · **Owner:** Syful Islam Shakil
**Status:** phases 1–3 shipped (2026-09-02). Reconciled with the shipped code 2026-09-03 — see
`IMPLEMENTATION_LOG.md` D1–D6 for what changed during implementation and why.

Let every dropdown in the admin remember what it should be set to, configurable per field,
reviewable in one place.

---

## 1. The problem

There are **65 files** under `src/app/(admin)` containing a dropdown. Most add-forms open with
every select empty, so recording a routine expense means re-picking the same account and the same
category every single time.

Worse, the app already has defaults — they're just arbitrary. Seven call sites silently pick the
first item in whatever order the list happened to arrive in:

```
finance/earnings/hooks/useEarningDrawer.ts:30      sourceId:    sources[0]?.id
finance/expenses/hooks/useExpenseForm.ts:28        categoryId:  categories[0]?.id
finance/payments/hooks/usePaymentDrawer.ts:30      employeeId:  employees[0]?.id
finance/subscriptions/hooks/useSubscriptionForm.ts categoryId:  categories[0]?.id
money/entries/hooks/useEntryDrawer.ts:35           accountId:   accounts[0]?.id
money/people/hooks/usePersonDetail.ts:81,136       accountId:   accounts[0]?.id
```

`accounts[0]` is "House Construction - Historical" — almost certainly not the account you want
pre-selected when adding a personal expense. So the feature isn't "add defaults"; it's **take the
defaults that already exist and put them under your control.**

---

## 2. Storage

The existing settings models (`SiteSettings`, `PropertySettings`, `AdminThemeSettings`) are
singletons with fixed columns. That shape is wrong here: the set of defaultable fields grows every
time a form gains a dropdown, and each one would need a migration. Use a keyed table instead.

```prisma
/// One user-chosen default for a single dropdown in a single form.
model FormDefault {
  id        String   @id @default(cuid())
  /// Stable form id, e.g. "money.entry", "property.expense". Never a route —
  /// routes move, and a default must survive that.
  scope     String
  /// Field within that form, e.g. "accountId".
  field     String
  /// The stored choice: a record id, or an enum value. "" means "no default".
  value     String
  /// "fixed"    — always start with this value
  /// "lastUsed" — start with whatever was chosen last time (see §7)
  mode      String   @default("fixed")
  updatedAt DateTime @updatedAt

  @@unique([scope, field])
}
```

One row per field, so the whole table is a few dozen rows and can be loaded once per session.

---

## 3. The registry

For a central settings page to _list_ what can be defaulted, the defaultable fields must be
declared rather than discovered. `src/lib/formDefaults/registry.ts`:

```ts
export interface DefaultableField {
  scope: string; // "money.entry"
  field: string; // "accountId"
  label: string; // "Account"
  module: string; // "Money Manager"    — grouping on the settings page
  form: string; // "Add Entry"        — grouping on the settings page
  /** Which option set the settings page should render to choose a value. */
  source:
    | "moneyAccounts"
    | "moneyCategories"
    | "payees"
    | "employees"
    | "incomeSources"
    | "currencies"
    | "enum";
  /** Starting mode for a field with no stored row yet (see §7). */
  mode: DefaultMode;
  /** For source: "enum" — the fixed choices. */
  options?: { value: string; label: string }[];
  /** One line explaining the choice, shown under the field in Settings. */
  hint?: string;
}

export const DEFAULTABLE_FIELDS: DefaultableField[] = [
  /* … */
];
```

This registry is the single source of truth. A field that isn't in it cannot be defaulted, and the
settings page never has to guess what a scope means.

Registering a field is only half the wiring — the form has to read it too, on **both** sides (seed on
open, report back on save). `lib/formDefaults/__tests__/wiring.test.ts` asserts that for every
registered scope, because a half-wired field shows a setting that does nothing (D6).

---

## 4. Loading and applying

Mirror `AdminThemeProvider`: one provider mounted in `AdminShell`, loading all defaults once.

```
src/lib/formDefaults/
  registry.ts                  the declared field list
  types.ts                     FormDefaultRow, DefaultsMap
src/components/admin/
  FormDefaultsProvider.tsx     loads once, exposes read + write
src/hooks/
  useFormDefaults.ts           useFormDefaults(scope, availableOptions)
src/services/admin/
  formDefaults.ts              list / upsert / clear
src/app/api/admin/form-defaults/route.ts        GET, PUT
src/app/(admin)/admin/settings/defaults/        the central page
```

**The hook validates before it returns.** A default pointing at a deleted or deactivated account
must not silently poison a form:

```ts
// The hook takes only the scope; the live options are passed to seed() at the
// moment the form opens, since that is when the form knows what it will render.
const defaults = useFormDefaults("money.entry");

const seeded = defaults.seed({
  accountId: accounts.map((a) => a.id),
  categoryId: categoryIdsFor(categories, BLANK_ENTRY.direction),
});
```

The list passed to `seed` must be **exactly** what that dropdown renders, not a superset. A value the
dropdown has no option for renders as an empty field while the id stays in form state, so the
mismatch is invisible until the server refuses the save (D5).

This is the same discipline as the AI categorisation guard: a stored value is re-checked against
live data at the point of use, never trusted because it was valid when it was saved.

**Applied on open-add only.** In `useEntryDrawer.openAdd`:

```ts
setForm({ ...BLANK_ENTRY, date: todayInput(), ...seeded });
```

`openEdit` must **never** apply defaults — an existing record shows its own values, or editing a row
would quietly rewrite it. This is the one way this feature can corrupt data, so it is the one rule
that matters.

---

## 5. Setting a default — two entry points

Both are needed; they serve different moments.

**Inline** — a small pin affordance on `SearchableSelect`, shown when the field is registered as
defaultable. You are looking at the value you want when you decide to make it the default, so this
is where the thought actually occurs. One shared component change covers every dropdown that opts in.

**Central** — `Settings → Defaults`, listing every registered field grouped by module and form, each
with its current value, a picker, and a clear button. This is what "controlled on every feature"
means: one screen to review and change the lot, rather than hunting through drawers.

---

## 6. Scope for v1

Roughly fifteen fields, chosen for how often they're re-picked:

| Module   | Form                    | Fields                           |
| -------- | ----------------------- | -------------------------------- |
| Money    | Add Entry               | account, category, method        |
| Money    | Transfer                | from account, to account         |
| Money    | Record Payment (people) | account                          |
| Property | Record Payment          | account, transaction type        |
| Property | Expense                 | payee, category, account         |
| Finance  | Earning                 | income source, currency, account |
| Finance  | Expense                 | category, account                |
| Finance  | Salary Payment          | employee, account                |
| Trips    | Expense                 | payer, funding account, currency |

The seven hardcoded `[0]` call sites in §1 all sit inside these forms, so this pass replaces every
one of them.

---

## 7. Optional: "remember last used"

`mode: "lastUsed"` stores the value on save instead of in settings, so the field starts wherever you
left it. Same table, same hook, one extra write in the mutation path.

Worth having because the two modes suit different fields: an account is usually _fixed_ (personal
expenses always come from one wallet), while a category is usually _last used_ (you record three
cement purchases in a row, then move on).

**Shipped in phase 1, not deferred** — the mode is one column on the same row and one branch in the
same hook, so supporting both cost almost nothing. Two rules came out of building it: the **server**
decides the effective mode (stored row first, registry second) so a stale tab cannot overwrite a
pinned value, and the server **returns the rows it wrote** so the client mirrors what was stored
rather than guessing (D5).

---

## 8. Phases

| Phase                     | Scope                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **1 — Plumbing** ✅       | `FormDefault` model + migration, registry, service, API route, provider, `useFormDefaults` with option validation. No UI.             |
| **2 — Apply** ✅          | Wire the Money forms (Add Entry, Transfer, Record Payment) and delete their `accounts[0]` fallbacks. Prove the pattern on one module. |
| **3 — Central page** ✅   | `Settings → Defaults`, grouped by module/form. Shipped at `/admin/settings/defaults`.                                                 |
| **4 — Inline pin**        | `SearchableSelect` affordance for registered fields.                                                                                  |
| **5 — Rest of the forms** | Property, Finance, Trips — mechanical once 2 lands.                                                                                   |
| ~~**Optional**~~ ✅       | `lastUsed` mode — shipped with phase 1 rather than deferred (§7).                                                                     |

---

## 9. Rules

1. **Defaults apply on add, never on edit.** The only way this feature can corrupt data.
2. **Validate against live options at the point of use.** A deleted account must degrade to an empty
   field, never to a broken form or a stale id sent to the API.
3. **A default is a starting value, not a constraint.** Every field stays freely editable.
4. **The registry is the source of truth.** No scope string invented at a call site.
5. **Server-side defaults stay out of this.** This fills a form the user then submits; it never
   changes what an API does with a request that omits a field.
