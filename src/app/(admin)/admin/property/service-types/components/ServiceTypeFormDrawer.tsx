import {
  Drawer,
  Typography,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Button,
} from "@mui/material";
import type { ExpenseCategory } from "@/types";
import { CATEGORIES, type ServiceTypeForm } from "../types";

interface ServiceTypeFormDrawerProps {
  open: boolean;
  editing: boolean;
  form: ServiceTypeForm;
  onFormChange: (form: ServiceTypeForm) => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function ServiceTypeFormDrawer({
  open,
  editing,
  form,
  onFormChange,
  saving,
  error,
  onSave,
  onClose,
}: ServiceTypeFormDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 380 }, p: 3 } } }}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700 }}>
        {editing ? "Edit Service Type" : "Add Service Type"}
      </Typography>

      <TextField
        label="Name *"
        value={form.name}
        onChange={(e) => onFormChange({ ...form, name: e.target.value })}
        size="small"
        fullWidth
        sx={{ mb: 2 }}
      />

      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>Category *</InputLabel>
        <Select
          label="Category *"
          value={form.category}
          onChange={(e) => onFormChange({ ...form, category: e.target.value as ExpenseCategory })}
        >
          {CATEGORIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        label="Description"
        value={form.description}
        onChange={(e) => onFormChange({ ...form, description: e.target.value })}
        size="small"
        fullWidth
        multiline
        rows={2}
        sx={{ mb: 2 }}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button variant="contained" fullWidth disabled={!form.name || saving} onClick={onSave}>
        {saving ? "Saving…" : editing ? "Save Changes" : "Add Service Type"}
      </Button>
    </Drawer>
  );
}
