import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { MoneyAccountType } from "@/types";
import { ACCOUNT_TYPE_LABEL } from "../../format";
import type { AccountTypeForm } from "../hooks/useAccountTypeForm";

const KIND_OPTIONS = (Object.keys(ACCOUNT_TYPE_LABEL) as MoneyAccountType[]).map((k) => ({
  value: k,
  label: ACCOUNT_TYPE_LABEL[k],
}));

interface Props {
  open: boolean;
  editing: boolean;
  form: AccountTypeForm;
  saving: boolean;
  error: string | null;
  onChange: (updater: (f: AccountTypeForm) => AccountTypeForm) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function AccountTypeFormDrawer(p: Props) {
  return (
    <Drawer
      anchor="right"
      open={p.open}
      onClose={p.onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {p.editing ? "Rename Account Type" : "Add Account Type"}
        </Typography>
        <TextField
          label="Name"
          placeholder="e.g. bKash, Savings, Brokerage"
          size="small"
          fullWidth
          value={p.form.name}
          onChange={(e) => p.onChange((f) => ({ ...f, name: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <SearchableSelect
          label="Behaves as"
          value={p.form.kind}
          options={KIND_OPTIONS}
          disabled={p.editing}
          onChange={(v) => p.onChange((f) => ({ ...f, kind: v as MoneyAccountType }))}
          sx={{ mb: 0.5 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          {p.editing
            ? "Fixed once created, so existing accounts keep behaving the same way."
            : "Credit card enables a credit limit and keeps trip spend off the ledger. Can't be changed later."}
        </Typography>
        {p.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {p.error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={p.onSave}
          disabled={p.saving || !p.form.name.trim()}
        >
          {p.saving ? "Saving…" : p.editing ? "Save Changes" : "Add Account Type"}
        </Button>
      </Box>
    </Drawer>
  );
}
