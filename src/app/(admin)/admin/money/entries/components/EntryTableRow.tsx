import { Chip, TableCell, TableRow, Typography } from "@mui/material";
import type { MoneyEntryRow } from "@/types";
import { fmtDate, DIRECTION_LABEL, METHOD_LABEL } from "../../format";
import EntryAmountCell, { amountColor } from "./EntryAmountCell";
import EntryRowActions from "./EntryRowActions";

interface EntryTableRowProps {
  entry: MoneyEntryRow;
  accountName: (id: string | null) => string;
  onEdit: (e: MoneyEntryRow) => void;
  onDelete: (id: string) => void;
}

const DIR_COLOR: Record<MoneyEntryRow["direction"], "success" | "warning" | "info"> = {
  CREDIT: "success",
  DEBIT: "warning",
  TRANSFER: "info",
};

export default function EntryTableRow({
  entry: e,
  accountName,
  onEdit,
  onDelete,
}: EntryTableRowProps) {
  return (
    <TableRow hover>
      <TableCell data-label="Date">{fmtDate(e.date)}</TableCell>
      <TableCell data-label="Type">
        <Chip
          size="small"
          label={DIRECTION_LABEL[e.direction]}
          color={DIR_COLOR[e.direction]}
          variant="outlined"
        />
      </TableCell>
      <TableCell data-label="Category">
        {e.direction === "TRANSFER"
          ? `${accountName(e.accountId)} → ${accountName(e.transferAccountId)}`
          : (e.categoryName ?? "—")}
        {e.beneficiaryName ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {e.beneficiaryName}
          </Typography>
        ) : null}
        {e.method ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {METHOD_LABEL[e.method]}
          </Typography>
        ) : null}
      </TableCell>
      <TableCell data-label="Account">
        {e.direction === "TRANSFER" ? "—" : accountName(e.accountId)}
      </TableCell>
      <TableCell
        align="right"
        data-label="Amount"
        sx={{ fontWeight: 700, color: amountColor(e.direction) }}
      >
        <EntryAmountCell entry={e} />
      </TableCell>
      <TableCell data-label="Description">
        <Typography variant="caption" color="text.secondary">
          {e.description ?? "—"}
        </Typography>
      </TableCell>
      <TableCell data-label="Actions">
        <EntryRowActions entry={e} onEdit={onEdit} onDelete={onDelete} />
      </TableCell>
    </TableRow>
  );
}
