"use client";

// The one way to pick a Money account anywhere in the admin: an "Account type"
// select that narrows an "Account" select. The type is only a filter — records
// store the account, which already knows its type — so the parent keeps both in
// form state purely to seed and remember defaults.
//
// All decisions (what is selectable, how the two halves stay consistent) live
// in lib/accountPicker.ts, which is unit-tested; this file only renders them.
import { Box, type SxProps, type Theme } from "@mui/material";
import SearchableSelect, { type SelectOption } from "./SearchableSelect";
import {
  selectAccount,
  selectableAccounts,
  selectableTypes,
  selectType,
  type AccountFilter,
  type AccountSelection,
  type PickerAccount,
} from "@/lib/accountPicker";

interface Props<A extends PickerAccount> {
  accounts: A[];
  value: AccountSelection;
  onChange: (next: AccountSelection) => void;
  accountLabel?: string;
  typeLabel?: string;
  /** Offer an explicit "no account" choice (for forms where the account is optional). */
  optional?: boolean;
  noneLabel?: string;
  /** Form-specific narrowing, e.g. a currency or "not the destination wallet". */
  filter?: AccountFilter<A>;
  optionLabel?: (a: A) => string;
  disabled?: boolean;
  sx?: SxProps<Theme>;
}

const ALL_TYPES = "";
const defaultLabel = (a: PickerAccount) =>
  a.currency && a.currency !== "BDT" ? `${a.name} (${a.currency})` : a.name;

export default function AccountTypeAccountSelect<A extends PickerAccount>({
  accounts,
  value,
  onChange,
  accountLabel = "Account",
  typeLabel = "Account type",
  optional = false,
  noneLabel = "— none —",
  filter,
  optionLabel = defaultLabel,
  disabled = false,
  sx,
}: Props<A>) {
  const keep = { filter, keepId: value.accountId };
  const typeOptions: SelectOption[] = [
    { value: ALL_TYPES, label: "All types" },
    ...selectableTypes(accounts, keep).map((t) => ({ value: t.id, label: t.name })),
  ];
  const accountOptions: SelectOption[] = [
    ...(optional ? [{ value: "", label: noneLabel }] : []),
    ...selectableAccounts(accounts, value.typeId, keep).map((a) => ({
      value: a.id,
      label: optionLabel(a),
    })),
  ];

  return (
    <Box
      sx={[
        { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "2fr 3fr" }, gap: 1.5 },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <SearchableSelect
        label={typeLabel}
        value={value.typeId}
        options={typeOptions}
        disabled={disabled}
        onChange={(typeId) => onChange(selectType(accounts, value, typeId))}
      />
      <SearchableSelect
        label={accountLabel}
        value={value.accountId}
        options={accountOptions}
        disabled={disabled}
        onChange={(accountId) => onChange(selectAccount(accounts, accountId, value.typeId))}
      />
    </Box>
  );
}
