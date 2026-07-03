import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";

type PersonForm = { name: string; relationship: string; phone: string; notes: string };

interface Props {
  open: boolean;
  editing: boolean;
  form: PersonForm;
  onChange: (form: PersonForm) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function PersonDrawer({
  open,
  editing,
  form,
  onChange,
  saving,
  error,
  onSave,
  onClose,
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
          {editing ? "Edit Person" : "Add Person"}
        </Typography>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Relationship"
          size="small"
          fullWidth
          placeholder="brother, house help, lender…"
          value={form.relationship}
          onChange={(e) => onChange({ ...form, relationship: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Phone"
          size="small"
          fullWidth
          value={form.phone}
          onChange={(e) => onChange({ ...form, phone: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Notes"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={form.notes}
          onChange={(e) => onChange({ ...form, notes: e.target.value })}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" fullWidth onClick={onSave} disabled={saving || !form.name}>
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Person"}
        </Button>
      </Box>
    </Drawer>
  );
}
