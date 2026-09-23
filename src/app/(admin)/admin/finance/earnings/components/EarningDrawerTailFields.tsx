import { TextField } from "@mui/material";
import type { EarningForm } from "../types";
import AccountTypeAccountSelect from "@/components/admin/AccountTypeAccountSelect";
import type { MoneyAccountRow } from "@/types";

interface EarningDrawerTailFieldsProps {
  editing: string | null;
  form: EarningForm;
  setForm: React.Dispatch<React.SetStateAction<EarningForm>>;
  accounts: MoneyAccountRow[];
}

export default function EarningDrawerTailFields({
  editing,
  form,
  setForm,
  accounts,
}: EarningDrawerTailFieldsProps) {
  return (
    <>
      <TextField
        label="Fiscal Year"
        size="small"
        fullWidth
        value={form.fiscalYear}
        onChange={(e) => setForm((f) => ({ ...f, fiscalYear: e.target.value }))}
        helperText="Auto-set from the date (July–June); override if needed."
        sx={{ mb: 2 }}
      />
      {!editing && (
        <AccountTypeAccountSelect
          accounts={accounts}
          accountLabel="Deposit to account (optional)"
          value={{ typeId: form.accountTypeId, accountId: form.accountId }}
          onChange={(sel) =>
            setForm((f) => ({ ...f, accountTypeId: sel.typeId, accountId: sel.accountId }))
          }
          optional
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
        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        sx={{ mb: 2 }}
      />
    </>
  );
}
