// The rules behind every "Account type → Account" picker in the admin. Pure —
// no React, no network — so the shared <AccountTypeAccountSelect> and each
// form's open-add seeding make the same decisions, and those decisions are
// unit-tested in one place.
//
// The account type is a *filter*, never stored on a record: the account already
// knows its type. It narrows the account list and nothing else.
//
// What "selectable" means, everywhere: the account is active AND its type is
// active. Archiving a type takes every account under it out of the pickers.
import type { MoneyAccountRow } from "@/types";

export type PickerAccount = Pick<
  MoneyAccountRow,
  | "id"
  | "name"
  | "type"
  | "currency"
  | "isActive"
  | "accountTypeId"
  | "accountTypeName"
  | "accountTypeActive"
  | "accountTypeSortOrder"
>;

/** Both halves of the picker. "" means "all types" / "no account". */
export interface AccountSelection {
  typeId: string;
  accountId: string;
}

export const EMPTY_SELECTION: AccountSelection = { typeId: "", accountId: "" };

/** A form-specific narrowing on top of the active rules (currency, not-this-wallet…). */
export type AccountFilter<A extends PickerAccount = PickerAccount> = (a: A) => boolean;

export const isSelectable = (a: PickerAccount): boolean => a.isActive && a.accountTypeActive;

interface Opts<A extends PickerAccount> {
  filter?: AccountFilter<A>;
  /**
   * An id to keep offering even though it is no longer selectable — the value
   * an existing record already holds. Editing must not blank a field just
   * because its account (or type) was archived since. The form's own `filter`
   * still applies: keeping bypasses archiving, not the form's rules.
   */
  keepId?: string;
}

const passes = <A extends PickerAccount>(a: A, { filter, keepId }: Opts<A>) =>
  (isSelectable(a) || (!!keepId && a.id === keepId)) && (!filter || filter(a));

/** Accounts the picker offers for the chosen type ("" = every type). */
export function selectableAccounts<A extends PickerAccount>(
  accounts: A[],
  typeId: string,
  opts: Opts<A> = {}
): A[] {
  return accounts.filter((a) => passes(a, opts) && (!typeId || a.accountTypeId === typeId));
}

/**
 * The type filter's options, derived from the accounts themselves: a type with
 * nothing to pick under it would be a filter that always comes back empty.
 * Ordered by the type's sort order, as set on the Account Types page.
 */
export function selectableTypes<A extends PickerAccount>(
  accounts: A[],
  opts: Opts<A> = {}
): { id: string; name: string }[] {
  const byId = new Map<string, { id: string; name: string; sort: number }>();
  for (const a of selectableAccounts(accounts, "", opts)) {
    if (!byId.has(a.accountTypeId)) {
      byId.set(a.accountTypeId, {
        id: a.accountTypeId,
        name: a.accountTypeName,
        sort: a.accountTypeSortOrder,
      });
    }
  }
  return [...byId.values()]
    .sort((x, y) => x.sort - y.sort || x.name.localeCompare(y.name))
    .map(({ id, name }) => ({ id, name }));
}

/** Picking an account: the type snaps to that account's, so the two never disagree. */
export function selectAccount(accounts: PickerAccount[], accountId: string, currentTypeId = "") {
  if (!accountId) return { typeId: currentTypeId, accountId: "" };
  const a = accounts.find((x) => x.id === accountId);
  return { typeId: a?.accountTypeId ?? currentTypeId, accountId };
}

/**
 * Picking a type: the account survives only if it belongs to the new type.
 * Clearing the type ("all types") never clears the account.
 */
export function selectType(
  accounts: PickerAccount[],
  current: AccountSelection,
  typeId: string
): AccountSelection {
  if (!typeId || !current.accountId) return { typeId, accountId: current.accountId };
  const a = accounts.find((x) => x.id === current.accountId);
  return { typeId, accountId: a?.accountTypeId === typeId ? current.accountId : "" };
}

/**
 * Reconcile stored defaults into a starting selection for a new record. The
 * account is the more specific choice, so it wins: a default account under a
 * different type than the default type keeps the account and takes its type.
 * Anything no longer selectable is dropped rather than seeded.
 */
export function seedSelection<A extends PickerAccount>(
  accounts: A[],
  seeded: { typeId?: string; accountId?: string },
  filter?: AccountFilter<A>
): AccountSelection {
  const pool = selectableAccounts(accounts, "", { filter });
  const account = seeded.accountId ? pool.find((a) => a.id === seeded.accountId) : undefined;
  if (account) return { typeId: account.accountTypeId, accountId: account.id };
  const typeOk = !!seeded.typeId && pool.some((a) => a.accountTypeId === seeded.typeId);
  return { typeId: typeOk ? seeded.typeId! : "", accountId: "" };
}

/** Ids for `useFormDefaults().seed()` validation — stale defaults are dropped. */
export function selectableIds<A extends PickerAccount>(accounts: A[], filter?: AccountFilter<A>) {
  const pool = selectableAccounts(accounts, "", { filter });
  return {
    accountIds: pool.map((a) => a.id),
    typeIds: [...new Set(pool.map((a) => a.accountTypeId))],
  };
}

/**
 * Some forms pre-picked "the first Bank account" (salaries) or "the first Cash
 * account" (rent receipts) before defaults existed. That stays as the fallback
 * when nothing is stored, so those forms keep behaving as they did — but only
 * over selectable accounts, and a stored default always wins.
 */
export function withKindFallback<A extends PickerAccount>(
  accounts: A[],
  sel: AccountSelection,
  kind: MoneyAccountRow["type"] | null
): AccountSelection {
  if (sel.accountId || sel.typeId || !kind) return sel;
  const a = accounts.find((x) => isSelectable(x) && x.type === kind);
  return a ? { typeId: a.accountTypeId, accountId: a.id } : sel;
}

/** The type an existing record's account belongs to — for opening an edit. */
export const typeOfAccount = (accounts: PickerAccount[], accountId: string | null | undefined) =>
  (accountId && accounts.find((a) => a.id === accountId)?.accountTypeId) || "";

// ─── Form-defaults plumbing ──────────────────────────────────────────────────
// A picker's two fields in form-defaults terms: "accountTypeId"/"accountId", or
// with a prefix "fromAccountTypeId"/"fromAccountId" (see formDefaults/registry).

const pairKey = (prefix: string, field: string) =>
  prefix ? `${prefix}${field[0].toUpperCase()}${field.slice(1)}` : field;

/** The field names a picker's defaults are stored under. */
export const pairFields = (prefix = "") => ({
  type: pairKey(prefix, "accountTypeId"),
  account: pairKey(prefix, "accountId"),
});

/** What `useFormDefaults().seed()` may return for this picker — anything else is stale. */
export function pairValidValues<A extends PickerAccount>(
  accounts: A[],
  opts: { prefix?: string; filter?: AccountFilter<A> } = {}
): Record<string, string[]> {
  const f = pairFields(opts.prefix);
  const ids = selectableIds(accounts, opts.filter);
  return { [f.type]: ids.typeIds, [f.account]: ids.accountIds };
}

/** Turn seeded defaults into the picker's starting selection. */
export function seedAccountPair<A extends PickerAccount>(
  accounts: A[],
  seeded: Record<string, string>,
  opts: { prefix?: string; filter?: AccountFilter<A> } = {}
): AccountSelection {
  const f = pairFields(opts.prefix);
  return seedSelection(
    accounts,
    { typeId: seeded[f.type], accountId: seeded[f.account] },
    opts.filter
  );
}

/** The values to hand `useFormDefaults().remember()` after a save. */
export function rememberAccountPair(sel: AccountSelection, prefix = ""): Record<string, string> {
  const f = pairFields(prefix);
  return { [f.type]: sel.typeId, [f.account]: sel.accountId };
}
