import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";

interface ServiceDrawerProps {
  open: boolean;
  editing: boolean;
  name: string;
  onNameChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function ServiceDrawer({
  open,
  editing,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  saving,
  error,
  onSave,
  onClose,
}: ServiceDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Service" : "Add Service"}
        </Typography>
        <TextField
          label="Service Name"
          size="small"
          fullWidth
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="e.g. WiFi, Parking, Generator"
        />
        <TextField
          label="Description (optional)"
          size="small"
          fullWidth
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" fullWidth onClick={onSave} disabled={saving || !name}>
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Service"}
        </Button>
      </Box>
    </Drawer>
  );
}
