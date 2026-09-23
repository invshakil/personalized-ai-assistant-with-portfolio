import type { Dispatch, SetStateAction } from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { CategoryRow } from "../../types";
import type { SubForm } from "../types";
import NumberField from "@/components/admin/NumberField";

interface SubscriptionFormFieldsProps {
  editing: string | null;
  form: SubForm;
  onFormChange: Dispatch<SetStateAction<SubForm>>;
  categories: CategoryRow[];
}

export default function SubscriptionFormFields({
  editing,
  form,
  onFormChange,
  categories,
}: SubscriptionFormFieldsProps) {
  return (
    <>
      <TextField
        label="Service name"
        size="small"
        fullWidth
        value={form.name}
        onChange={(e) => onFormChange((f) => ({ ...f, name: e.target.value }))}
        sx={{ mb: 2 }}
      />
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          label="Category"
          value={form.categoryId}
          onChange={(e) => onFormChange((f) => ({ ...f, categoryId: e.target.value }))}
        >
          {categories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <NumberField
        label={editing ? "Starting amount (৳)" : "Monthly amount (৳)"}
        size="small"
        fullWidth
        value={form.monthlyAmount}
        onChange={(v) => onFormChange((f) => ({ ...f, monthlyAmount: v }))}
        sx={{ mb: 2 }}
      />
      <TextField
        label="Start month"
        type="month"
        size="small"
        fullWidth
        value={form.startMonth}
        onChange={(e) => onFormChange((f) => ({ ...f, startMonth: e.target.value }))}
        helperText="Charges are generated monthly from this month onward."
        sx={{ mb: 2 }}
      />
      <TextField
        label="Notes"
        size="small"
        fullWidth
        multiline
        rows={2}
        value={form.notes}
        onChange={(e) => onFormChange((f) => ({ ...f, notes: e.target.value }))}
        sx={{ mb: 2 }}
      />
    </>
  );
}
