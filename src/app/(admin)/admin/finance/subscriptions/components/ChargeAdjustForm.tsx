import type { Dispatch, SetStateAction } from "react";
import { Box, Button, TableCell, TextField } from "@mui/material";
import type { SubscriptionCharge } from "../../types";
import type { AdjustingState } from "../types";

interface ChargeAdjustFormProps {
  charge: SubscriptionCharge;
  adjusting: AdjustingState;
  onAdjustingChange: Dispatch<SetStateAction<AdjustingState | null>>;
  busy: boolean;
  onSave: () => void;
  onClear: (month: string | null) => void;
  onCancel: () => void;
}

export default function ChargeAdjustForm({
  charge,
  adjusting,
  onAdjustingChange,
  busy,
  onSave,
  onClear,
  onCancel,
}: ChargeAdjustFormProps) {
  return (
    <TableCell colSpan={2}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <TextField
          label="Amount (৳)"
          type="number"
          size="small"
          value={adjusting.amount}
          onChange={(e) => onAdjustingChange((a) => (a ? { ...a, amount: e.target.value } : a))}
        />
        <TextField
          label="Note (optional)"
          size="small"
          placeholder="e.g. Coupon WELCOME50"
          value={adjusting.note}
          onChange={(e) => onAdjustingChange((a) => (a ? { ...a, note: e.target.value } : a))}
        />
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            onClick={onSave}
            disabled={busy || adjusting.amount === ""}
          >
            Save
          </Button>
          {charge.isOverride && (
            <Button
              size="small"
              color="warning"
              onClick={() => onClear(charge.date)}
              disabled={busy}
            >
              Clear
            </Button>
          )}
          <Button size="small" color="inherit" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </Box>
      </Box>
    </TableCell>
  );
}
