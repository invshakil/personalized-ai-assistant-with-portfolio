import { FormControlLabel, Switch, TextField } from "@mui/material";
import { currencySymbol } from "../../format";
import type { AccountForm } from "../hooks/useAccountForm";
import AccountTypeCurrencyFields from "./AccountTypeCurrencyFields";

interface Props {
  form: AccountForm;
  editingHasEntries: boolean;
  onChange: (updater: (f: AccountForm) => AccountForm) => void;
}

/** The name/type/currency/balance/notes/active fields shared by the add & edit drawer. */
export default function AccountFormFields({ form, editingHasEntries, onChange }: Props) {
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
        editingHasEntries={editingHasEntries}
        onChange={onChange}
      />
      <TextField
        label={
          form.type === "CREDIT_CARD"
            ? `Opening balance (${currencySymbol(form.currency)}, negative if owed)`
            : `Opening balance (${currencySymbol(form.currency)})`
        }
        type="number"
        size="small"
        fullWidth
        value={form.openingBalance}
        onChange={(e) => onChange((f) => ({ ...f, openingBalance: e.target.value }))}
        helperText="The real balance you currently hold (or owe) in this account."
        sx={{ mb: 2 }}
      />
      {form.type === "CREDIT_CARD" && (
        <TextField
          label={`Credit limit (${currencySymbol(form.currency)})`}
          type="number"
          size="small"
          fullWidth
          value={form.creditLimit}
          onChange={(e) => onChange((f) => ({ ...f, creditLimit: e.target.value }))}
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
