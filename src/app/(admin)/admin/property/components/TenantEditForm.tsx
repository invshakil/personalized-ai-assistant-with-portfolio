import { Box, Button, TextField } from "@mui/material";
import type { MoneyAccountRow } from "@/types";
import type { AccountSelection } from "@/lib/accountPicker";
import type { TenantForm } from "../types";
import TenantEditAdvanceFields from "./TenantEditAdvanceFields";

interface TenantEditFormProps {
  form: TenantForm;
  onFormChange: (form: TenantForm) => void;
  advanceDelta: number;
  accounts: MoneyAccountRow[];
  advanceAccount: AccountSelection;
  onAdvanceAccountChange: (sel: AccountSelection) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function TenantEditForm({
  form,
  onFormChange,
  advanceDelta,
  accounts,
  advanceAccount,
  onAdvanceAccountChange,
  saving,
  onCancel,
  onSave,
}: TenantEditFormProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <TextField
        label="Full Name"
        value={form.name}
        onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        size="small"
        fullWidth
      />
      <TextField
        label="Phone"
        value={form.phone}
        onChange={(e) => onFormChange({ ...form, phone: e.target.value })}
        size="small"
        fullWidth
      />
      <TextField
        label="Move-in Date"
        type="date"
        value={form.moveInDate}
        onChange={(e) => onFormChange({ ...form, moveInDate: e.target.value })}
        size="small"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        label="Lease End Date"
        type="date"
        value={form.leaseEndDate}
        onChange={(e) => onFormChange({ ...form, leaseEndDate: e.target.value })}
        size="small"
        fullWidth
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TenantEditAdvanceFields
        form={form}
        onFormChange={onFormChange}
        advanceDelta={advanceDelta}
        accounts={accounts}
        advanceAccount={advanceAccount}
        onAdvanceAccountChange={onAdvanceAccountChange}
      />
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" size="small" fullWidth onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" size="small" fullWidth onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Box>
    </Box>
  );
}
