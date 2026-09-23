import { FormControlLabel, Switch, TextField } from "@mui/material";
import type { ExpenseForm } from "../types";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow } from "@/types";

interface ExpenseFormExtraFieldsProps {
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  editing: boolean;
  accounts: MoneyAccountRow[];
}

export default function ExpenseFormExtraFields({
  form,
  onFormChange,
  editing,
  accounts,
}: ExpenseFormExtraFieldsProps) {
  return (
    <>
      {!editing && (
        <AccountTypeAccountSelect
          accounts={accounts}
          accountLabel="Pay from account (optional)"
          value={{ typeId: form.accountTypeId, accountId: form.accountId }}
          onChange={(sel) =>
            onFormChange({ ...form, accountTypeId: sel.typeId, accountId: sel.accountId })
          }
          optional
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
