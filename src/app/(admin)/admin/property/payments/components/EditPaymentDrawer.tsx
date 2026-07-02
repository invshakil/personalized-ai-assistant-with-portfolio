import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import type { EditPaymentState } from "../types";

interface EditPaymentDrawerProps {
  payment: EditPaymentState | null;
  onChange: (patch: Partial<EditPaymentState>) => void;
  loading: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function EditPaymentDrawer({
  payment,
  onChange,
  loading,
  error,
  onSave,
  onClose,
}: EditPaymentDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={!!payment}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Edit Payment
        </Typography>
        {payment && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {payment.tenantName}
          </Typography>
        )}
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
          Editing Rent Due recalculates the balance and status. Use this to correct the billed
          amount — e.g. to split embedded service fees from base rent.
        </Alert>
        <TextField
          label="Rent Due (৳)"
          type="number"
          size="small"
          fullWidth
          value={payment?.rentDue ?? ""}
          onChange={(e) => onChange({ rentDue: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Notes (optional)"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={payment?.notes ?? ""}
          onChange={(e) => onChange({ notes: e.target.value })}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" fullWidth onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={onSave}
            disabled={loading || !payment?.rentDue || parseFloat(payment.rentDue) <= 0}
          >
            {loading ? "Saving…" : "Save"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
