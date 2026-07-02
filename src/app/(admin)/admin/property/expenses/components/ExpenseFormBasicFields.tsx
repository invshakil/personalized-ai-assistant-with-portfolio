import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { ExpenseCategory, Payee, PropertyServiceType } from "@/types";
import { CATEGORIES, CAT_LABELS, type ExpenseForm } from "../types";

interface ExpenseFormBasicFieldsProps {
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  serviceTypes: PropertyServiceType[];
  payees: Payee[];
}

export default function ExpenseFormBasicFields({
  form,
  onFormChange,
  serviceTypes,
  payees,
}: ExpenseFormBasicFieldsProps) {
  return (
    <>
      <TextField
        label="Description"
        size="small"
        fullWidth
        value={form.description}
        onChange={(e) => onFormChange({ ...form, description: e.target.value })}
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

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Category</InputLabel>
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => onFormChange({ ...form, category: e.target.value as ExpenseCategory })}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {CAT_LABELS[c]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Service Type</InputLabel>
        <Select
          label="Service Type"
          value={form.serviceTypeId}
          onChange={(e) => onFormChange({ ...form, serviceTypeId: e.target.value })}
        >
          <MenuItem value="">— None —</MenuItem>
          {serviceTypes.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Payee</InputLabel>
        <Select
          label="Payee"
          value={form.payeeId}
          onChange={(e) => onFormChange({ ...form, payeeId: e.target.value })}
        >
          <MenuItem value="">— None —</MenuItem>
          {payees
            .filter((p) => p.isActive)
            .map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.name} · {p.role}
              </MenuItem>
            ))}
        </Select>
      </FormControl>
    </>
  );
}
