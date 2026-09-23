import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { MoneyAccountType } from "@/types";
import type { AccountForm } from "../hooks/useAccountForm";
import AccountFormFields from "./AccountFormFields";

interface Props {
  open: boolean;
  editing: boolean;
  editingHasEntries: boolean;
  form: AccountForm;
  kind: MoneyAccountType | null;
  typeOptions: SelectOption[];
  saving: boolean;
  error: string | null;
  onChange: (updater: (f: AccountForm) => AccountForm) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function AccountFormDrawer({
  open,
  editing,
  editingHasEntries,
  form,
  kind,
  typeOptions,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Account" : "Add Account"}
        </Typography>
        <AccountFormFields
          form={form}
          kind={kind}
          typeOptions={typeOptions}
          editingHasEntries={editingHasEntries}
          onChange={onChange}
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
          disabled={saving || !form.name || !form.accountTypeId}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Account"}
        </Button>
      </Box>
    </Drawer>
  );
}
