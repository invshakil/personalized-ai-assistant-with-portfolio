import { Box, Button, TextField } from "@mui/material";
import { Check, X } from "lucide-react";

interface PendingRentChangeEditFormProps {
  editDate: string;
  onEditDateChange: (v: string) => void;
  editRent: string;
  onEditRentChange: (v: string) => void;
  editReason: string;
  onEditReasonChange: (v: string) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function PendingRentChangeEditForm({
  editDate,
  onEditDateChange,
  editRent,
  onEditRentChange,
  editReason,
  onEditReasonChange,
  saving,
  onCancel,
  onSave,
}: PendingRentChangeEditFormProps) {
  return (
    <Box sx={{ mt: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        <TextField
          label="Effective Date"
          type="date"
          size="small"
          sx={{ flex: 1 }}
          value={editDate}
          onChange={(e) => onEditDateChange(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="New Rent (৳)"
          type="number"
          size="small"
          sx={{ flex: 1 }}
          value={editRent}
          onChange={(e) => onEditRentChange(e.target.value)}
        />
      </Box>
      <TextField
        label="Reason (optional)"
        size="small"
        fullWidth
        value={editReason}
        onChange={(e) => onEditReasonChange(e.target.value)}
      />
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<X size={13} />}
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          startIcon={<Check size={13} />}
          onClick={onSave}
          disabled={saving || !editDate || !editRent}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </Box>
    </Box>
  );
}
