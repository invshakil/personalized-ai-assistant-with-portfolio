import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { EmployeeRow, SourceRow } from "../../types";
import type { PaymentForm } from "../types";
import PaymentDrawerBasicFields from "./PaymentDrawerBasicFields";
import PaymentDrawerAmountFields from "./PaymentDrawerAmountFields";

interface PaymentDrawerProps {
  open: boolean;
  editing: boolean;
  form: PaymentForm;
  setForm: (updater: (f: PaymentForm) => PaymentForm) => void;
  employees: EmployeeRow[];
  clients: SourceRow[];
  accountSelectOptions: SelectOption[];
  rateLoading: boolean;
  rateNote: string | null;
  previewBdt: number | null;
  rateMissing: boolean;
  saving: boolean;
  error: string | null;
  onDateChange: (date: string) => void;
  onCurrencyChange: (currency: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function PaymentDrawer({
  open,
  editing,
  form,
  setForm,
  employees,
  clients,
  accountSelectOptions,
  rateLoading,
  rateNote,
  previewBdt,
  rateMissing,
  saving,
  error,
  onDateChange,
  onCurrencyChange,
  onSave,
  onClose,
}: PaymentDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Payment" : "Add Payment"}
        </Typography>
        <PaymentDrawerBasicFields
          form={form}
          setForm={setForm}
          employees={employees}
          clients={clients}
          onDateChange={onDateChange}
        />
        <PaymentDrawerAmountFields
          form={form}
          setForm={setForm}
          accountSelectOptions={accountSelectOptions}
          editing={editing}
          rateLoading={rateLoading}
          rateNote={rateNote}
          previewBdt={previewBdt}
          onCurrencyChange={onCurrencyChange}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onSave}
          disabled={saving || !form.employeeId || !form.amount || rateMissing}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Payment"}
        </Button>
      </Box>
    </Drawer>
  );
}
