import { Chip, TableCell, TableRow, Typography } from "@mui/material";
import type { EarningRow } from "../../types";
import { fmtDate } from "../../format";
import { REMITTANCE_LABEL } from "../types";
import EarningAmountCell from "./EarningAmountCell";
import EarningRowActions from "./EarningRowActions";

interface EarningTableRowProps {
  earning: EarningRow;
  reversingId: string | null;
  onConvert: (currency: string, id: string) => void;
  onReverse: (id: string) => void;
  onEdit: (e: EarningRow) => void;
  onDelete: (id: string) => void;
}

export default function EarningTableRow({
  earning: e,
  reversingId,
  onConvert,
  onReverse,
  onEdit,
  onDelete,
}: EarningTableRowProps) {
  return (
    <TableRow hover>
      <TableCell data-label="Date">{fmtDate(e.date)}</TableCell>
      <TableCell data-label="Client">{e.sourceName}</TableCell>
      <TableCell data-label="Type">
        <Chip
          size="small"
          label={REMITTANCE_LABEL[e.remittance]}
          color={e.remittance === "REM" ? "success" : "default"}
          variant="outlined"
        />
      </TableCell>
      <TableCell align="right" data-label="Amount" sx={{ fontWeight: 600 }}>
        <EarningAmountCell earning={e} />
      </TableCell>
      <TableCell data-label="Fiscal Year">{e.fiscalYear}</TableCell>
      <TableCell data-label="Notes">
        <Typography variant="caption" color="text.secondary">
          {e.notes ?? "—"}
        </Typography>
      </TableCell>
      <TableCell data-label="Actions">
        <EarningRowActions
          earning={e}
          reversingId={reversingId}
          onConvert={onConvert}
          onReverse={onReverse}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </TableCell>
    </TableRow>
  );
}
