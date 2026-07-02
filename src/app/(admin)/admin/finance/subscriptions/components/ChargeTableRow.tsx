import type { Dispatch, SetStateAction } from "react";
import { Chip, IconButton, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { SlidersHorizontal, X } from "lucide-react";
import type { SubscriptionCharge } from "../../types";
import { fmt, fmtMonth } from "../../format";
import type { AdjustingState } from "../types";
import ChargeAdjustForm from "./ChargeAdjustForm";

interface ChargeTableRowProps {
  charge: SubscriptionCharge;
  adjusting: AdjustingState | null;
  onAdjustingChange: Dispatch<SetStateAction<AdjustingState | null>>;
  onStartAdjust: (chargeId: string, amount: number, note: string | null) => void;
  busy: boolean;
  onSave: () => void;
  onClear: (month: string | null) => void;
  onCancel: () => void;
}

export default function ChargeTableRow({
  charge,
  adjusting,
  onAdjustingChange,
  onStartAdjust,
  busy,
  onSave,
  onClear,
  onCancel,
}: ChargeTableRowProps) {
  const isEditing = adjusting?.chargeId === charge.id;

  return (
    <TableRow>
      <TableCell data-label="Month">
        {fmtMonth(charge.date)}
        {charge.isOverride && (
          <Chip
            size="small"
            label="Adjusted"
            color="info"
            variant="outlined"
            sx={{ ml: 0.75, height: 18, fontSize: "0.62rem" }}
          />
        )}
        {charge.note && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {charge.note}
          </Typography>
        )}
      </TableCell>
      {isEditing && adjusting ? (
        <ChargeAdjustForm
          charge={charge}
          adjusting={adjusting}
          onAdjustingChange={onAdjustingChange}
          busy={busy}
          onSave={onSave}
          onClear={onClear}
          onCancel={onCancel}
        />
      ) : (
        <>
          <TableCell
            align="right"
            data-label="Amount"
            sx={{ fontWeight: charge.isOverride ? 700 : 400 }}
          >
            {fmt(charge.amount)}
          </TableCell>
          <TableCell align="right" data-label="Adjust">
            <Tooltip title={charge.isOverride ? "Edit adjustment" : "Adjust this month"}>
              <IconButton
                size="small"
                onClick={() => onStartAdjust(charge.id, charge.amount, charge.note)}
              >
                {charge.isOverride ? <X size={14} /> : <SlidersHorizontal size={14} />}
              </IconButton>
            </Tooltip>
          </TableCell>
        </>
      )}
    </TableRow>
  );
}
