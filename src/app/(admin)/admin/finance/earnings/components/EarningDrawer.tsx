import { Alert, Box, Button, Drawer, Typography } from "@mui/material";
import type { SelectOption } from "@/components/admin/SearchableSelect";
import type { SourceRow } from "../../types";
import type { EarningForm } from "../types";
import EarningDrawerFields from "./EarningDrawerFields";

interface EarningDrawerProps {
  open: boolean;
  editing: string | null;
  form: EarningForm;
  setForm: React.Dispatch<React.SetStateAction<EarningForm>>;
  sources: SourceRow[];
  accountSelectOptions: SelectOption[];
  saving: boolean;
  error: string | null;
  rateLoading: boolean;
  rateNote: string | null;
  previewBdt: number | null;
  rateMissing: boolean;
  onClose: () => void;
  onDateChange: (date: string) => void;
  onCurrencyChange: (currency: string) => void;
  onSave: () => void;
}

export default function EarningDrawer({
  open,
  editing,
  form,
  setForm,
  sources,
  accountSelectOptions,
  saving,
  error,
  rateLoading,
  rateNote,
  previewBdt,
  rateMissing,
  onClose,
  onDateChange,
  onCurrencyChange,
  onSave,
}: EarningDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          {editing ? "Edit Earning" : "Add Earning"}
        </Typography>
        <EarningDrawerFields
          editing={editing}
          form={form}
          setForm={setForm}
          sources={sources}
          accountSelectOptions={accountSelectOptions}
          rateLoading={rateLoading}
          rateNote={rateNote}
          previewBdt={previewBdt}
          onDateChange={onDateChange}
          onCurrencyChange={onCurrencyChange}
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
          disabled={saving || !form.sourceId || !form.amount || rateMissing}
        >
          {saving ? "Saving…" : editing ? "Save Changes" : "Add Earning"}
        </Button>
      </Box>
    </Drawer>
  );
}
