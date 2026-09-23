import { Typography } from "@mui/material";
import CurrencySelect from "@/components/admin/CurrencySelect";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { AccountForm } from "../hooks/useAccountForm";

interface Props {
  form: AccountForm;
  typeOptions: SelectOption[];
  editingHasEntries: boolean;
  onChange: (updater: (f: AccountForm) => AccountForm) => void;
}

/** Type + currency selects, with the "currency locked" hint once entries exist. */
export default function AccountTypeCurrencyFields({
  form,
  typeOptions,
  editingHasEntries,
  onChange,
}: Props) {
  return (
    <>
      <SearchableSelect
        label="Account type"
        value={form.accountTypeId}
        options={typeOptions}
        onChange={(v) => onChange((f) => ({ ...f, accountTypeId: v }))}
        sx={{ mb: 2 }}
      />
      <CurrencySelect
        value={form.currency}
        onChange={(v) => onChange((f) => ({ ...f, currency: v }))}
        disabled={editingHasEntries}
        sx={{ mb: editingHasEntries ? 0.5 : 2 }}
      />
      {editingHasEntries && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          Currency is locked because this account already has ledger entries.
        </Typography>
      )}
    </>
  );
}
