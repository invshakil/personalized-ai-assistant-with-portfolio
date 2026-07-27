import { Alert, Box, Button, Drawer, TextField, Typography } from "@mui/material";
import SearchableSelect from "@/components/admin/SearchableSelect";
import type { BeneficiaryRow } from "@/types";
import type { ParticipantForm } from "../hooks/useTripParticipants";

interface Props {
  open: boolean;
  editing: boolean;
  form: ParticipantForm;
  beneficiaries: BeneficiaryRow[];
  saving: boolean;
  error: string | null;
  setForm: (updater: (f: ParticipantForm) => ParticipantForm) => void;
  onClose: () => void;
  onSave: () => void;
}

export default function ParticipantDrawer({
  open,
  editing,
  form,
  beneficiaries,
  saving,
  error,
  setForm,
  onClose,
  onSave,
}: Props) {
  const beneficiaryOptions = [
    { value: "", label: "— none —" },
    ...beneficiaries.map((b) => ({ value: b.id, label: b.name })),
  ];

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Person" : "Add Person"}
        </Typography>
        <TextField
          label="Name"
          size="small"
          fullWidth
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <SearchableSelect
          label="Link to a saved person (optional)"
          value={form.beneficiaryId}
          options={beneficiaryOptions}
          onChange={(v) => setForm((f) => ({ ...f, beneficiaryId: v }))}
          sx={{ mb: 0.5 }}
        />
        <Typography variant="caption" sx={{ display: "block", mb: 2, color: "text.secondary" }}>
          Linking ties their trip balance to your money-owed tracking.
        </Typography>
        <TextField
          label="Note"
          size="small"
          fullWidth
          multiline
          rows={2}
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onSave}
          disabled={saving || !form.name.trim()}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Person"}
        </Button>
      </Box>
    </Drawer>
  );
}
