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

interface EditTransactionDrawerProps {
  open: boolean;
  type: string;
  onTypeChange: (v: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  date: string;
  onDateChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  loading: boolean;
  error: string | null;
  onSave: () => void;
  onClose: () => void;
}

export default function EditTransactionDrawer({
  open,
  type,
  onTypeChange,
  amount,
  onAmountChange,
  date,
  onDateChange,
  notes,
  onNotesChange,
  loading,
  error,
  onSave,
  onClose,
}: EditTransactionDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 400 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
          Edit Transaction
        </Typography>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Type</InputLabel>
          <Select label="Type" value={type} onChange={(e) => onTypeChange(e.target.value)}>
            <MenuItem value="CASH">Cash</MenuItem>
            <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>
            <MenuItem value="ADVANCE_APPLIED">Advance Applied</MenuItem>
            <MenuItem value="ADJUSTMENT">Adjustment</MenuItem>
            <MenuItem value="OTHER">Other</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Amount (৳)"
          type="number"
          size="small"
          fullWidth
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="Date"
          type="date"
          size="small"
          fullWidth
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          sx={{ mb: 2 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Notes (optional)"
          size="small"
          fullWidth
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          sx={{ mb: 2 }}
        />
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" fullWidth onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={onSave}
            disabled={loading || !amount || parseFloat(amount) <= 0}
          >
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
