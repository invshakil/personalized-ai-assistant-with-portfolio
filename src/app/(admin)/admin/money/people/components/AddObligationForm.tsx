import {
  Box,
  Button,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { ObligationDirection, ObligationType } from "@/types";
import NumberField from "@/components/admin/NumberField";

type ObligationForm = {
  type: ObligationType;
  direction: ObligationDirection;
  amount: string;
  frequency: string;
  startDate: string;
  notes: string;
};

interface Props {
  form: ObligationForm;
  onChange: (form: ObligationForm) => void;
  saving: boolean;
  onSave: () => void;
}

export default function AddObligationForm({ form, onChange, saving, onSave }: Props) {
  return (
    <Card sx={{ bgcolor: "background.default", p: 1.5, mb: 2, mt: 1 }}>
      <Typography variant="caption" sx={{ fontWeight: 700 }}>
        Add obligation
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            label="Type"
            value={form.type}
            onChange={(e) => onChange({ ...form, type: e.target.value as ObligationType })}
          >
            <MenuItem value="LOAN">Loan</MenuItem>
            <MenuItem value="RECURRING">Recurring</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Direction</InputLabel>
          <Select
            label="Direction"
            value={form.direction}
            onChange={(e) =>
              onChange({ ...form, direction: e.target.value as ObligationDirection })
            }
          >
            <MenuItem value="OWED_BY_ME">I owe them</MenuItem>
            <MenuItem value="OWED_TO_ME">They owe me</MenuItem>
          </Select>
        </FormControl>
        <NumberField
          label={form.type === "LOAN" ? "Principal (৳)" : "Per-period (৳)"}
          size="small"
          sx={{ width: 140 }}
          value={form.amount}
          onChange={(v) => onChange({ ...form, amount: v })}
        />
        <TextField
          label="Start"
          type="date"
          size="small"
          sx={{ width: 150 }}
          value={form.startDate}
          onChange={(e) => onChange({ ...form, startDate: e.target.value })}
        />
      </Box>
      <Button
        size="small"
        variant="outlined"
        sx={{ mt: 1 }}
        onClick={onSave}
        disabled={saving || !form.amount}
      >
        {saving ? "Adding…" : "Add obligation"}
      </Button>
    </Card>
  );
}
