import { TextField } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { EarningForm } from "../types";

interface EarningDrawerTailFieldsProps {
  editing: string | null;
  form: EarningForm;
  setForm: React.Dispatch<React.SetStateAction<EarningForm>>;
  accountSelectOptions: SelectOption[];
}

export default function EarningDrawerTailFields({
  editing,
  form,
  setForm,
  accountSelectOptions,
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
        <SearchableSelect
          label="Deposit to account (optional)"
          value={form.accountId}
          options={accountSelectOptions}
          onChange={(v) => setForm((f) => ({ ...f, accountId: v }))}
          clearable
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
