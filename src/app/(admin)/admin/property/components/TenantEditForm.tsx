import { Box, Button, FormControlLabel, Switch, TextField } from "@mui/material";
import type { TenantForm } from "../types";
import NumberField from "@/components/admin/NumberField";

interface TenantEditFormProps {
  form: TenantForm;
  onFormChange: (form: TenantForm) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function TenantEditForm({
  form,
  onFormChange,
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
      <FormControlLabel
        control={
          <Switch
            checked={form.advancePaid}
            onChange={(e) => onFormChange({ ...form, advancePaid: e.target.checked })}
          />
        }
        label="Advance Paid"
      />
      {form.advancePaid && (
        <NumberField
          label="Advance Amount (৳)"
          value={form.advanceAmount}
          onChange={(v) => onFormChange({ ...form, advanceAmount: v })}
          size="small"
          fullWidth
        />
      )}
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
