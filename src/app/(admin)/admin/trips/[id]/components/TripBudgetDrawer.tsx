import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import { TRIP_CATEGORIES, TRIP_CATEGORY_LABEL } from "@/types";

interface Props {
  open: boolean;
  form: Record<string, string>;
  saving: boolean;
  error: string | null;
  homeCurrency: string;
  onChange: (updater: (f: Record<string, string>) => Record<string, string>) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function TripBudgetDrawer({
  open,
  form,
  saving,
  error,
  homeCurrency,
  onChange,
  onClose,
  onSave,
}: Props) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Edit budgets
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          Planned amounts in {homeCurrency}. Leave blank for no budget.
        </Typography>
        {TRIP_CATEGORIES.map((c) => (
          <TextField
            key={c}
            label={TRIP_CATEGORY_LABEL[c]}
            type="number"
            size="small"
            fullWidth
            value={form[c] ?? ""}
            onChange={(e) => onChange((f) => ({ ...f, [c]: e.target.value }))}
            sx={{ mb: 2 }}
          />
        ))}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button variant="contained" fullWidth onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save Budgets"}
        </Button>
      </Box>
    </Drawer>
  );
}
