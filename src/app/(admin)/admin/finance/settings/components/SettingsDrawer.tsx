import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Alert,
  Button,
  Drawer,
} from "@mui/material";
import { TITLE } from "../types";
import type { DrawerState } from "../types";

interface Props {
  drawer: DrawerState | null;
  onChange: (drawer: DrawerState) => void;
  onClose: () => void;
  saving: boolean;
  error: string | null;
  onSave: () => void;
}

export default function SettingsDrawer({
  drawer,
  onChange,
  onClose,
  saving,
  error,
  onSave,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={!!drawer}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 380 } } } }}
    >
      {drawer && (
        <Box sx={{ width: "100%", p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {drawer.editingId ? "Edit" : "Add"} {TITLE[drawer.kind].replace(/s$/, "")}
          </Typography>
          <TextField
            label="Name"
            size="small"
            fullWidth
            value={drawer.name}
            onChange={(e) => onChange({ ...drawer, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          {drawer.kind === "employee" && (
            <TextField
              label="Phone"
              size="small"
              fullWidth
              value={drawer.phone}
              onChange={(e) => onChange({ ...drawer, phone: e.target.value })}
              placeholder="e.g. +880 1XXX XXXXXX"
              sx={{ mb: 2 }}
            />
          )}
          {(drawer.kind === "employee" || drawer.kind === "source") && (
            <TextField
              label="Notes"
              size="small"
              fullWidth
              multiline
              rows={2}
              value={drawer.notes}
              onChange={(e) => onChange({ ...drawer, notes: e.target.value })}
              sx={{ mb: 2 }}
            />
          )}
          {drawer.kind === "employee" && (
            <FormControlLabel
              control={
                <Switch
                  checked={drawer.isActive}
                  onChange={(e) => onChange({ ...drawer, isActive: e.target.checked })}
                />
              }
              label="Active"
              sx={{ mb: 1, display: "block" }}
            />
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Button
            variant="contained"
            fullWidth
            onClick={onSave}
            disabled={saving || !drawer.name.trim()}
          >
            {saving ? "Saving…" : drawer.editingId ? "Save Changes" : "Add"}
          </Button>
        </Box>
      )}
    </Drawer>
  );
}
