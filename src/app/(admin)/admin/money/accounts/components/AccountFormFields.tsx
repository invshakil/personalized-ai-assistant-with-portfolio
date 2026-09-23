import { FormControlLabel, Switch, TextField } from "@mui/material";
import { currencySymbol } from "../../format";
import type { AccountForm } from "../hooks/useAccountForm";
import AccountTypeCurrencyFields from "./AccountTypeCurrencyFields";
import NumberField from "@/components/admin/NumberField";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { MoneyAccountType } from "@/types";

interface Props {
  form: AccountForm;
  /** The selected type's kind — a credit card gets a credit limit. */
  kind: MoneyAccountType | null;
  typeOptions: SelectOption[];
  editingHasEntries: boolean;
  onChange: (updater: (f: AccountForm) => AccountForm) => void;
}

/** The name/type/currency/balance/notes/active fields shared by the add & edit drawer. */
export default function AccountFormFields({
  form,
  kind,
  typeOptions,
  editingHasEntries,
  onChange,
}: Props) {
  return (
    <>
      <TextField
        label="Name"
        size="small"
        fullWidth
        value={form.name}
        onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <AccountTypeCurrencyFields
        form={form}
        typeOptions={typeOptions}
        editingHasEntries={editingHasEntries}
        onChange={onChange}
      />
      <NumberField
        label={
          kind === "CREDIT_CARD"
            ? `Opening balance (${currencySymbol(form.currency)}, negative if owed)`
            : `Opening balance (${currencySymbol(form.currency)})`
        }
        size="small"
        fullWidth
        value={form.openingBalance}
        onChange={(v) => onChange((f) => ({ ...f, openingBalance: v }))}
        helperText="The real balance you currently hold (or owe) in this account."
        sx={{ mb: 2 }}
      />
      {kind === "CREDIT_CARD" && (
        <NumberField
          label={`Credit limit (${currencySymbol(form.currency)})`}
          size="small"
          fullWidth
          value={form.creditLimit}
          onChange={(v) => onChange((f) => ({ ...f, creditLimit: v }))}
          sx={{ mb: 2 }}
        />
      )}
      <TextField
        label="Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.notes}
        onChange={(e) => onChange((f) => ({ ...f, notes: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <FormControlLabel
        control={
          <Switch
            checked={form.isActive}
            onChange={(e) => onChange((f) => ({ ...f, isActive: e.target.checked }))}
          />
        }
        label="Active"
        sx={{ mb: 2, display: "block" }}
      />
    </>
  );
}
