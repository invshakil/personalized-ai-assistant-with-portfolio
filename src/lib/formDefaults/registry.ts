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
  | "accountTypes"
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

/**
 * The two fields behind one "Account type → Account" picker. The type is only a
 * filter, so its default narrows the account list; when both are set and
 * disagree, the account wins (see lib/accountPicker.ts → seedSelection).
 */
function accountPair(
  scope: string,
  module: string,
  form: string,
  opts: { prefix?: string; label?: string; hint?: string } = {}
): DefaultableField[] {
  const { prefix = "", label = "Account", hint } = opts;
  const key = (f: string) => (prefix ? `${prefix}${f[0].toUpperCase()}${f.slice(1)}` : f);
  return [
    {
      scope,
      field: key("accountTypeId"),
      label: `${label} type`,
      module,
      form,
      source: "accountTypes",
      mode: "fixed",
      hint: "Narrows the account list. Ignored when a default account is set.",
    },
    {
      scope,
      field: key("accountId"),
      label,
      module,
      form,
      source: "moneyAccounts",
      mode: "fixed",
      hint,
    },
  ];
}

// Accounts default to "fixed" and categories to "lastUsed" on purpose: money
// tends to come from the same wallet every time, while categories arrive in
// runs — three cement purchases, then something else entirely.
export const DEFAULTABLE_FIELDS: DefaultableField[] = [
  ...accountPair("money.entry", "Money Manager", "Add Entry", {
    hint: "Which account a new entry is recorded against.",
  }),
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
  ...accountPair("money.transfer", "Money Manager", "Transfer", {
    prefix: "from",
    label: "From account",
  }),
  ...accountPair("money.transfer", "Money Manager", "Transfer", {
    prefix: "to",
    label: "To account",
  }),
  ...accountPair("money.personPayment", "Money Manager", "Record Payment (People)", {
    hint: "Which account a payment to a person comes from.",
  }),
  ...accountPair("finance.payment", "Financial Tracker", "Salary Payment", {
    label: "Pay from account",
  }),
  ...accountPair("finance.expense", "Financial Tracker", "Business Expense", {
    label: "Pay from account",
  }),
  ...accountPair("finance.earning", "Financial Tracker", "Earning", {
    label: "Deposit to account",
  }),
  ...accountPair("finance.convert", "Financial Tracker", "Convert Earnings", {
    prefix: "to",
    label: "To account (BDT)",
  }),
  ...accountPair("property.payment", "Property", "Rent Receipt", {
    label: "Add to account",
    hint: "Unset: the first account matching the receipt type (Cash / Bank).",
  }),
  ...accountPair("property.expense", "Property", "Property Expense", {
    label: "Pay from account",
  }),
  ...accountPair("property.advance", "Property", "Tenant Advance", {
    label: "Add advance to account",
  }),
];

const byKey = new Map(DEFAULTABLE_FIELDS.map((f) => [`${f.scope}|${f.field}`, f]));

export const fieldKey = (scope: string, field: string): string => `${scope}|${field}`;

/** The registry entry for a (scope, field), or undefined if it isn't defaultable. */
export const findField = (scope: string, field: string): DefaultableField | undefined =>
  byKey.get(fieldKey(scope, field));

/** Every registered field for one form. */
export const fieldsForScope = (scope: string): DefaultableField[] =>
  DEFAULTABLE_FIELDS.filter((f) => f.scope === scope);
