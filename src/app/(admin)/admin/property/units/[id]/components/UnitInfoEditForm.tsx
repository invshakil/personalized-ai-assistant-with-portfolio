import { Box, Button, TextField, Typography } from "@mui/material";
import type { UnitEditForm } from "../types";

interface UnitInfoEditFormProps {
  editForm: UnitEditForm;
  onEditFormChange: (form: UnitEditForm) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function UnitInfoEditForm({
  editForm,
  onEditFormChange,
  saving,
  onCancel,
  onSave,
}: UnitInfoEditFormProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 480 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Edit Unit
      </Typography>
      <TextField
        label="Unit Number"
        value={editForm.unitNumber}
        onChange={(e) => onEditFormChange({ ...editForm, unitNumber: e.target.value })}
        size="small"
        fullWidth
      />
      <TextField
        label="Floor"
        value={editForm.floor}
        onChange={(e) => onEditFormChange({ ...editForm, floor: e.target.value })}
        size="small"
        fullWidth
      />
      <TextField
        label="Monthly Rent (৳)"
        type="number"
        value={editForm.monthlyRent}
        onChange={(e) => onEditFormChange({ ...editForm, monthlyRent: e.target.value })}
        size="small"
        fullWidth
      />
      <TextField
        label="Description"
        value={editForm.description}
        onChange={(e) => onEditFormChange({ ...editForm, description: e.target.value })}
        size="small"
        fullWidth
        multiline
        rows={2}
      />
      <TextField
        label="Notes"
        value={editForm.notes}
        onChange={(e) => onEditFormChange({ ...editForm, notes: e.target.value })}
        size="small"
        fullWidth
        multiline
        rows={2}
      />
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" size="small" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" size="small" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </Box>
    </Box>
  );
}
