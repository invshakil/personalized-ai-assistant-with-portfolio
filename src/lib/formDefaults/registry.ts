// The declared list of dropdowns that can carry a default.
//
// Declared rather than discovered, for two reasons: the Settings page has to be
// able to list what is defaultable without guessing what a scope string means,
// and a field that is not registered cannot be defaulted by a hand-made API
// call. This file is pure (no Prisma, no React) so both the server service and
// the client provider can import it.
//
// Adding a dropdown to this list is not enough on its own — the form's open-add
// path also has to call `useFormDefaults`. Keep the two in step; an entry here
// with no wiring shows the user a setting that does nothing.

/** How a field's default is maintained. */
export type DefaultMode = "fixed" | "lastUsed";

/** Which option set the Settings page renders to choose a value. */
export type OptionSource =
  | "moneyAccounts"
  | "moneyCategories"
  | "payees"
  | "employees"
  | "incomeSources"
  | "currencies"
  | "enum";

export interface DefaultableField {
  /** Stable form id — a form identifier, never a route. */
  scope: string;
  /** Field name within that form's state, e.g. "accountId". */
  field: string;
  /** Shown on the Settings page. */
  label: string;
  /** Grouping — the module this form belongs to. */
  module: string;
  /** Grouping — the form within that module. */
  form: string;
  source: OptionSource;
  /** Starting mode for a field with no stored row yet. */
  mode: DefaultMode;
  /** For `source: "enum"` — the fixed choices. */
  options?: { value: string; label: string }[];
  /** One line explaining the choice, shown under the field in Settings. */
  hint?: string;
}

// Accounts default to "fixed" and categories to "lastUsed" on purpose: money
// tends to come from the same wallet every time, while categories arrive in
// runs — three cement purchases, then something else entirely.
export const DEFAULTABLE_FIELDS: DefaultableField[] = [
  {
    scope: "money.entry",
    field: "accountId",
    label: "Account",
    module: "Money Manager",
    form: "Add Entry",
    source: "moneyAccounts",
    mode: "fixed",
    hint: "Which account a new entry is recorded against.",
  },
  {
    scope: "money.entry",
    field: "categoryId",
    label: "Category",
    module: "Money Manager",
    form: "Add Entry",
    source: "moneyCategories",
    mode: "lastUsed",
    hint: "Remembers the last category you saved.",
  },
  {
    scope: "money.transfer",
    field: "fromAccountId",
    label: "From account",
    module: "Money Manager",
    form: "Transfer",
    source: "moneyAccounts",
    mode: "fixed",
  },
  {
    scope: "money.transfer",
    field: "toAccountId",
    label: "To account",
    module: "Money Manager",
    form: "Transfer",
    source: "moneyAccounts",
    mode: "fixed",
  },
  {
    scope: "money.personPayment",
    field: "accountId",
    label: "Account",
    module: "Money Manager",
    form: "Record Payment (People)",
    source: "moneyAccounts",
    mode: "fixed",
    hint: "Which account a payment to a person comes from.",
  },
];

const byKey = new Map(DEFAULTABLE_FIELDS.map((f) => [`${f.scope}|${f.field}`, f]));

export const fieldKey = (scope: string, field: string): string => `${scope}|${field}`;

/** The registry entry for a (scope, field), or undefined if it isn't defaultable. */
export const findField = (scope: string, field: string): DefaultableField | undefined =>
  byKey.get(fieldKey(scope, field));

/** Every registered field for one form. */
export const fieldsForScope = (scope: string): DefaultableField[] =>
  DEFAULTABLE_FIELDS.filter((f) => f.scope === scope);
