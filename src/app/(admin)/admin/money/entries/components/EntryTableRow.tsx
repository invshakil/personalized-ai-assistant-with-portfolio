import { Chip, TableCell, TableRow, Typography } from "@mui/material";
import type { MoneyEntryRow } from "@/types";
import { fmtDate, DIRECTION_LABEL } from "../../format";
import EntryAmountCell, { amountColor } from "./EntryAmountCell";
import EntryCategoryCell from "./EntryCategoryCell";
import EntryRowActions from "./EntryRowActions";

interface EntryTableRowProps {
  entry: MoneyEntryRow;
  accountName: (id: string | null) => string;
  onEdit: (e: MoneyEntryRow) => void;
  onDelete: (id: string) => void;
  onTypeClick: (direction: MoneyEntryRow["direction"]) => void;
  onCategoryClick: (categoryId: string) => void;
  onAccountClick: (accountId: string) => void;
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
  onTypeClick,
  onCategoryClick,
  onAccountClick,
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
          clickable
          onClick={() => onTypeClick(e.direction)}
        />
      </TableCell>
      <TableCell data-label="Category">
        <EntryCategoryCell entry={e} accountName={accountName} onCategoryClick={onCategoryClick} />
      </TableCell>
      <TableCell data-label="Account">
        {e.direction === "TRANSFER" || !e.accountId ? (
          "—"
        ) : (
          <Chip
            size="small"
            label={accountName(e.accountId)}
            variant="outlined"
            clickable
            onClick={() => onAccountClick(e.accountId!)}
          />
        )}
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
