import type { Dispatch, SetStateAction } from "react";
import { Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Tag } from "lucide-react";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { SubscriptionDetail } from "../../types";
import type { AdjustingState } from "../types";
import ChargeTableRow from "./ChargeTableRow";

interface ChargeHistoryTableProps {
  detail: SubscriptionDetail;
  adjusting: AdjustingState | null;
  onAdjustingChange: Dispatch<SetStateAction<AdjustingState | null>>;
  onStartAdjust: (chargeId: string, amount: number, note: string | null) => void;
  busy: boolean;
  onSave: () => void;
  onClear: (month: string | null) => void;
  onCancel: () => void;
}

export default function ChargeHistoryTable({
  detail,
  adjusting,
  onAdjustingChange,
  onStartAdjust,
  busy,
  onSave,
  onClear,
  onCancel,
}: ChargeHistoryTableProps) {
  return (
    <>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5, display: "flex", gap: 0.75 }}>
        <Tag size={16} /> Monthly charges
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Use “Adjust” for a discount or coupon on a single month.
      </Typography>
      <Table size="small" sx={{ ...mobileCardTableSx, mt: 1 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Amount
            </TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Adjust
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {detail.charges.map((c) => (
            <ChargeTableRow
              key={c.id}
              charge={c}
              adjusting={adjusting}
              onAdjustingChange={onAdjustingChange}
              onStartAdjust={onStartAdjust}
              busy={busy}
              onSave={onSave}
              onClear={onClear}
              onCancel={onCancel}
            />
          ))}
        </TableBody>
      </Table>
    </>
  );
}
