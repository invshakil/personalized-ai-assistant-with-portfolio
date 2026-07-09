import {
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Trash2 } from "lucide-react";
import type { OneOffCharge } from "@/types";
import { MONTHS, fmt } from "../types";
import type { ChargesTarget } from "../hooks/useOneOffCharges";

interface ChargesDrawerProps {
  target: ChargesTarget | null;
  charges: OneOffCharge[];
  label: string;
  onLabelChange: (v: string) => void;
  amount: string;
  onAmountChange: (v: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  loading: boolean;
  error: string | null;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onClose: () => void;
}

export default function ChargesDrawer({
  target,
  charges,
  label,
  onLabelChange,
  amount,
  onAmountChange,
  notes,
  onNotesChange,
  loading,
  error,
  onAdd,
  onRemove,
  onClose,
}: ChargesDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={!!target}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          One-off Charges
        </Typography>
        {target && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {target.tenantName} · {MONTHS[target.month - 1]} {target.year}
          </Typography>
        )}
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
          One-time charges (maintenance, repairs, etc.) are billed with this month&apos;s rent. They
          are added to the total due immediately and don&apos;t recur.
        </Alert>

        {charges.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {charges.map((c) => (
              <Box
                key={c.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: 0.75,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {c.label}
                  </Typography>
                  {c.notes && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {c.notes}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {fmt(c.amount)}
                  </Typography>
                  <Tooltip title="Remove charge">
                    <IconButton size="small" color="error" onClick={() => onRemove(c.id)}>
                      <Trash2 size={15} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          Add a charge
        </Typography>
        <TextField
          label="Description"
          placeholder="e.g. Maintenance fee"
          size="small"
          fullWidth
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          sx={{ mb: 2 }}
        />
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
          label="Notes (optional)"
          size="small"
          fullWidth
          multiline
          rows={2}
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
            Close
          </Button>
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={onAdd}
            disabled={loading || !label.trim() || !amount || parseFloat(amount) <= 0}
          >
            {loading ? "Adding…" : "Add Charge"}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
