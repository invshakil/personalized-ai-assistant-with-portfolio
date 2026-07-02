import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountRow } from "@/types";
import { NO_ACCOUNT, type ExpenseForm } from "../types";

const PAYMENT_MODES = ["Cash", "Bank Transfer", "Mobile Banking", "Other"];

interface ExpenseFormExtraFieldsProps {
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  editing: boolean;
  accounts: MoneyAccountRow[];
  expenseAccountId: string;
  onAccountChange: (id: string) => void;
}

export default function ExpenseFormExtraFields({
  form,
  onFormChange,
  editing,
  accounts,
  expenseAccountId,
  onAccountChange,
}: ExpenseFormExtraFieldsProps) {
  return (
    <>
      <TextField
        label="Date"
        type="date"
        size="small"
        fullWidth
        value={form.expenseDate}
        onChange={(e) => onFormChange({ ...form, expenseDate: e.target.value })}
        sx={{ mb: 2 }}
      />

      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Payment Mode</InputLabel>
        <Select
          label="Payment Mode"
          value={form.paymentMode}
          onChange={(e) => onFormChange({ ...form, paymentMode: e.target.value })}
        >
          {PAYMENT_MODES.map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Optional wallet link — create-only (no back-sync on edit) */}
      {!editing && accounts.length > 0 && (
        <SearchableSelect
          label="Pay from wallet/account (optional)"
          value={expenseAccountId}
          options={[
            { value: NO_ACCOUNT, label: "— none / don't deduct from wallet —" },
            ...accounts.map((a) => ({ value: a.id, label: a.name })),
          ]}
          onChange={onAccountChange}
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
        onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
        sx={{ mb: 2 }}
      />
    </>
  );
}
