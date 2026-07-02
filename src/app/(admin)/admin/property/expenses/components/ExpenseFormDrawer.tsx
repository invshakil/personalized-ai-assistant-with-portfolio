import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { Payee, PropertyServiceType, MoneyAccountRow } from "@/types";
import type { ExpenseForm } from "../types";
import ExpenseFormBasicFields from "./ExpenseFormBasicFields";
import ExpenseFormExtraFields from "./ExpenseFormExtraFields";

interface ExpenseFormDrawerProps {
  open: boolean;
  editing: boolean;
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
  serviceTypes: PropertyServiceType[];
  payees: Payee[];
  accounts: MoneyAccountRow[];
  expenseAccountId: string;
  onAccountChange: (id: string) => void;
}

export default function ExpenseFormDrawer({
  open,
  editing,
  form,
  onFormChange,
  saving,
  error,
  onSave,
  onClose,
  serviceTypes,
  payees,
  accounts,
  expenseAccountId,
  onAccountChange,
}: ExpenseFormDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Expense" : "Add Expense"}
        </Typography>

        <ExpenseFormBasicFields
          form={form}
          onFormChange={onFormChange}
          serviceTypes={serviceTypes}
          payees={payees}
        />
        <ExpenseFormExtraFields
          form={form}
          onFormChange={onFormChange}
          editing={editing}
          accounts={accounts}
          expenseAccountId={expenseAccountId}
          onAccountChange={onAccountChange}
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
          disabled={saving || !form.description || !form.amount}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
        </Button>
      </Box>
    </Drawer>
  );
}
