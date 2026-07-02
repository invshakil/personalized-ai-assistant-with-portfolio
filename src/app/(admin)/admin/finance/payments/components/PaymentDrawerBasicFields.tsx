import {
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
} from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { EmployeeRow, SourceRow } from "../../types";
import { KINDS, KIND_LABEL, type PaymentForm } from "../types";

interface PaymentDrawerBasicFieldsProps {
  form: PaymentForm;
  setForm: (updater: (f: PaymentForm) => PaymentForm) => void;
  employees: EmployeeRow[];
  clients: SourceRow[];
  onDateChange: (date: string) => void;
}

export default function PaymentDrawerBasicFields({
  form,
  setForm,
  employees,
  clients,
  onDateChange,
}: PaymentDrawerBasicFieldsProps) {
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
      <SearchableSelect
        label="Employee"
        value={form.employeeId}
        options={employees.map((emp) => ({ value: emp.id, label: emp.name }))}
        onChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}
        sx={{ mb: 2 }}
      />
      <SearchableSelect
        label="Type"
        value={form.type}
        options={KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))}
        onChange={(v) => setForm((f) => ({ ...f, type: v as PaymentForm["type"] }))}
        sx={{ mb: 2 }}
      />
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Client(s)</InputLabel>
        <Select
          multiple
          label="Client(s)"
          value={form.clientIds}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              clientIds:
                typeof e.target.value === "string" ? e.target.value.split(",") : e.target.value,
            }))
          }
          input={<OutlinedInput label="Client(s)" />}
          renderValue={(selected) => (
            <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
              {(selected as string[]).map((id) => {
                const c = clients.find((x) => x.id === id);
                return <Chip key={id} size="small" label={c?.name ?? id} />;
              })}
            </Stack>
          )}
        >
          {clients.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <TextField
        label="Note (optional)"
        size="small"
        fullWidth
        value={form.reference}
        onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
        placeholder="e.g. wedding bonus"
        sx={{ mb: 2 }}
      />
    </>
  );
}
