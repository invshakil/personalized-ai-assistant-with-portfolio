import { Box, Button, Divider, TextField, Typography } from "@mui/material";
import { Plus, TrendingUp } from "lucide-react";
import type { RentChangeForm } from "../types";
import { fmt } from "../types";

interface RentChangeSectionProps {
  currentRent: number;
  showForm: boolean;
  onShowForm: () => void;
  form: RentChangeForm;
  onFormChange: (form: RentChangeForm) => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export default function RentChangeSection({
  currentRent,
  showForm,
  onShowForm,
  form,
  onFormChange,
  saving,
  onCancel,
  onSave,
}: RentChangeSectionProps) {
  return (
    <>
      <Divider sx={{ my: 2.5 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TrendingUp size={15} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Scheduled Rent Changes
          </Typography>
        </Box>
        {!showForm && (
          <Button size="small" startIcon={<Plus size={13} />} onClick={onShowForm}>
            Add
          </Button>
        )}
      </Box>

      {showForm ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            Current rent: {fmt(currentRent)}
          </Typography>
          <TextField
            label="Effective Date"
            type="date"
            value={form.effectiveDate}
            onChange={(e) => onFormChange({ ...form, effectiveDate: e.target.value })}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="New Rent (৳)"
            type="number"
            value={form.newRent}
            onChange={(e) => onFormChange({ ...form, newRent: e.target.value })}
            size="small"
            fullWidth
          />
          <TextField
            label="Reason (optional)"
            value={form.reason}
            onChange={(e) => onFormChange({ ...form, reason: e.target.value })}
            size="small"
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" fullWidth onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button
              variant="contained"
              size="small"
              fullWidth
              onClick={onSave}
              disabled={saving || !form.effectiveDate || !form.newRent}
            >
              {saving ? "Saving…" : "Schedule"}
            </Button>
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary">
          Changes are applied automatically when payments are generated for the effective month.
        </Typography>
      )}
    </>
  );
}
