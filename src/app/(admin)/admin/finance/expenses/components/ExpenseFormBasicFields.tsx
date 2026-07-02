import { TextField } from "@mui/material";
import SearchableSelect, { type SelectOption } from "@/components/admin/SearchableSelect";
import type { ExpenseForm } from "../types";

interface ExpenseFormBasicFieldsProps {
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  onDateChange: (date: string) => void;
  categoryOptions: SelectOption[];
}

export default function ExpenseFormBasicFields({
  form,
  onFormChange,
  onDateChange,
  categoryOptions,
}: ExpenseFormBasicFieldsProps) {
  return (
    <>
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={form.date}
        onChange={(e) => onDateChange(e.target.value)}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Tool / Service"
        size="small"
        fullWidth
        value={form.name}
        onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="Category"
        value={form.categoryId}
        options={categoryOptions}
        onChange={(v) => onFormChange({ ...form, categoryId: v })}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Amount (৳)"
        type="number"
        size="small"
        fullWidth
        value={form.amount}
        onChange={(e) => onFormChange({ ...form, amount: e.target.value })}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Fiscal Year"
        size="small"
        fullWidth
        value={form.fiscalYear}
        onChange={(e) => onFormChange({ ...form, fiscalYear: e.target.value })}
        helperText="Auto-set from the date (July–June); override if needed."
        sx={{ mb: 2 }}
      />
    </>
  );
}
