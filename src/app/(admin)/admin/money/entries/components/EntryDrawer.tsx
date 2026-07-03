import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { MoneyAccountRow, MoneyCategoryRow, BeneficiaryRow, ObligationRow } from "@/types";
import type { EntryDir, EntryForm } from "../types";
import EntryDrawerBasicFields from "./EntryDrawerBasicFields";
import EntryObligationLink from "./EntryObligationLink";

interface EntryDrawerProps {
  open: boolean;
  editing: string | null;
  form: EntryForm;
  setForm: React.Dispatch<React.SetStateAction<EntryForm>>;
  accounts: MoneyAccountRow[];
  formCategories: MoneyCategoryRow[];
  beneficiaries: BeneficiaryRow[];
  saving: boolean;
  error: string | null;
  linkLoading: boolean;
  linkObligationOptions: ObligationRow[];
  selectedObligation: ObligationRow | null;
  onClose: () => void;
  onDirectionChange: (direction: EntryDir) => void;
  onSave: () => void;
}

export default function EntryDrawer({
  open,
  editing,
  form,
  setForm,
  accounts,
  formCategories,
  beneficiaries,
  saving,
  error,
  linkLoading,
  linkObligationOptions,
  selectedObligation,
  onClose,
  onDirectionChange,
  onSave,
}: EntryDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Entry" : "Add Entry"}
        </Typography>
        <EntryDrawerBasicFields
          form={form}
          setForm={setForm}
          accounts={accounts}
          formCategories={formCategories}
          onDirectionChange={onDirectionChange}
        />
        <EntryObligationLink
          form={form}
          setForm={setForm}
          beneficiaries={beneficiaries}
          linkLoading={linkLoading}
          linkObligationOptions={linkObligationOptions}
          selectedObligation={selectedObligation}
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
          disabled={saving || !form.amount || !form.categoryId}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Entry"}
        </Button>
      </Box>
    </Drawer>
  );
}
