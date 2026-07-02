import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { ExpenseForm } from "../types";
import ExpenseFormBasicFields from "./ExpenseFormBasicFields";
import ExpenseFormExtraFields from "./ExpenseFormExtraFields";

interface ExpenseFormDrawerProps {
  open: boolean;
  editing: boolean;
  form: ExpenseForm;
  onFormChange: (form: ExpenseForm) => void;
  onDateChange: (date: string) => void;
  categoryOptions: SelectOption[];
  accountSelectOptions: SelectOption[];
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function ExpenseFormDrawer({
  open,
  editing,
  form,
  onFormChange,
  onDateChange,
  categoryOptions,
  accountSelectOptions,
  saving,
  error,
  onSave,
  onClose,
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
          onDateChange={onDateChange}
          categoryOptions={categoryOptions}
        />
        <ExpenseFormExtraFields
          form={form}
          onFormChange={onFormChange}
          editing={editing}
          accountSelectOptions={accountSelectOptions}
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
          disabled={saving || !form.name || !form.categoryId || !form.amount}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Expense"}
        </Button>
      </Box>
    </Drawer>
  );
}
