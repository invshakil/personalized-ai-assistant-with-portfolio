import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { MoneyAccountRow } from "@/types";
import type { TripForm } from "../hooks/useTripForm";
import TripFormFields from "./TripFormFields";

interface Props {
  open: boolean;
  editing: boolean;
  form: TripForm;
  accounts: MoneyAccountRow[];
  saving: boolean;
  error: string | null;
  onChange: (updater: (f: TripForm) => TripForm) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function TripFormDrawer({
  open,
  editing,
  form,
  accounts,
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
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 440 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Trip" : "New Trip"}
        </Typography>
        <TripFormFields form={form} accounts={accounts} onChange={onChange} />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onSave}
          disabled={saving || !form.name || !form.destination}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Create Trip"}
        </Button>
      </Box>
    </Drawer>
  );
}
