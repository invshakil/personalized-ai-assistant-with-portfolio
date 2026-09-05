import {
  Alert,
  Box,
  Button,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { MoneyCategoryKind } from "@/types";
import type { CategoryForm } from "../hooks/useCategoryForm";

interface Props {
  open: boolean;
  editing: boolean;
  form: CategoryForm;
  saving: boolean;
  error: string | null;
  onChange: (updater: (f: CategoryForm) => CategoryForm) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function CategoryFormDrawer({
  open,
  editing,
  form,
  saving,
  error,
  onChange,
  onClose,
  onSave,
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
          {editing ? "Edit Category" : "Add Category"}
        </Typography>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={form.name}
          onChange={(e) => onChange((f) => ({ ...f, name: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Kind</InputLabel>
          <Select
            label="Kind"
            value={form.kind}
            onChange={(e) => onChange((f) => ({ ...f, kind: e.target.value as MoneyCategoryKind }))}
          >
            <MenuItem value="EXPENSE">Expense</MenuItem>
            <MenuItem value="INCOME">Income</MenuItem>
          </Select>
        </FormControl>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" fullWidth onClick={onSave} disabled={saving || !form.name}>
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Category"}
        </Button>
      </Box>
    </Drawer>
  );
}
