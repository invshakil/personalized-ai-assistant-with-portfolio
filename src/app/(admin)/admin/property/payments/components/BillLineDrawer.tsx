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
import { MONTHS, fmt } from "../types";
import type { BillLine, BillLineTarget } from "../hooks/useBillLines";

/** Copy + presentation for the two kinds of bill adjustment. */
const VARIANTS = {
  charge: {
    title: "One-off Charges",
    blurb:
      "One-time charges (maintenance, repairs, etc.) are billed with this month's rent. They are added to the total due immediately and don't recur.",
    addHeading: "Add a charge",
    placeholder: "e.g. Maintenance fee",
    submit: "Add Charge",
    submitting: "Adding…",
    removeTip: "Remove charge",
    color: "text.primary",
    sign: "",
  },
  voucher: {
    title: "Vouchers",
    blurb:
      "A voucher credits this month's bill — a discount, or paying the tenant back for something they covered that you owe (e.g. maintenance). It is subtracted from the total due immediately.",
    addHeading: "Issue a voucher",
    placeholder: "e.g. Maintenance paid by tenant",
    submit: "Issue Voucher",
    submitting: "Issuing…",
    removeTip: "Remove voucher",
    color: "success.main",
    sign: "−",
  },
} as const;

interface Props {
  variant: keyof typeof VARIANTS;
  target: BillLineTarget | null;
  lines: BillLine[];
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

export default function BillLineDrawer({
  variant,
  target,
  lines,
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
}: Props) {
  const v = VARIANTS[variant];

  return (
    <Drawer
      anchor="right"
      open={!!target}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
    >
      <Box sx={{ width: "100%", p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          {v.title}
        </Typography>
        {target && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {target.tenantName} · {MONTHS[target.month - 1]} {target.year}
          </Typography>
        )}
        <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
          {v.blurb}
        </Alert>

        {lines.length > 0 && (
          <Box sx={{ mb: 2 }}>
            {lines.map((line) => (
              <Box
                key={line.id}
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
                    {line.label}
                  </Typography>
                  {line.notes && (
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {line.notes}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: v.color }}>
                    {v.sign}
                    {fmt(line.amount)}
                  </Typography>
                  <Tooltip title={v.removeTip}>
                    <IconButton size="small" color="error" onClick={() => onRemove(line.id)}>
                      <Trash2 size={15} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
          {v.addHeading}
        </Typography>
        <TextField
          label="Description"
          placeholder={v.placeholder}
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
            {loading ? v.submitting : v.submit}
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
}
