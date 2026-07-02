import { FormControlLabel, Switch, TextField } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { ExpenseForm } from "../types";

interface ExpenseFormExtraFieldsProps {
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  editing: boolean;
  accountSelectOptions: SelectOption[];
}

export default function ExpenseFormExtraFields({
  form,
  onFormChange,
  editing,
  accountSelectOptions,
}: ExpenseFormExtraFieldsProps) {
  return (
    <>
      {!editing && (
        <SearchableSelect
          label="Pay from account (optional)"
          value={form.accountId}
          options={accountSelectOptions}
          onChange={(v) => onFormChange({ ...form, accountId: v })}
          clearable
          sx={{ mb: 2 }}
        />
      )}
      <FormControlLabel
        control={
          <Switch
            checked={form.isRecurring}
            onChange={(e) => onFormChange({ ...form, isRecurring: e.target.checked })}
          />
        }
        label="Recurring subscription"
        sx={{ mb: 1, display: "block" }}
      />
      <TextField
        label="Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.notes}
        onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
        sx={{ mb: 2 }}
      />
    </>
  );
}
