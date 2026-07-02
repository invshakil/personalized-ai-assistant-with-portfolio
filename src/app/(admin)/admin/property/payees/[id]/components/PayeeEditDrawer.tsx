import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import type { Payee } from "@/types";

const FIELDS = ["name", "role", "phone", "email", "address", "nidNumber"] as const;

interface PayeeEditDrawerProps {
  open: boolean;
  form: Partial<Payee>;
  onFormChange: (form: Partial<Payee>) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function PayeeEditDrawer({
  open,
  form,
  onFormChange,
  saving,
  error,
  onSave,
  onClose,
}: PayeeEditDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 }, p: 3 } } }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
        Edit Payee
      </Typography>

      {FIELDS.map((key) => (
        <TextField
          key={key}
          label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
          value={(form[key] as string) ?? ""}
          onChange={(e) => onFormChange({ ...form, [key]: e.target.value })}
          size="small"
          fullWidth
          sx={{ mb: 2 }}
        />
      ))}
      <TextField
        label="Notes"
        value={(form.notes as string) ?? ""}
        onChange={(e) => onFormChange({ ...form, notes: e.target.value })}
        size="small"
        fullWidth
        multiline
        rows={3}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button variant="outlined" fullWidth onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" fullWidth disabled={saving} onClick={onSave}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Box>
    </Drawer>
  );
}
