import NextLink from "next/link";
import { Box, IconButton, Tooltip } from "@mui/material";
import { ArrowLeftRight, Pencil, PiggyBank, Trash2 } from "lucide-react";
import type { MoneyAccountRow } from "@/types";

interface Props {
  account: MoneyAccountRow;
  onEdit: (a: MoneyAccountRow) => void;
  onDelete: (a: MoneyAccountRow) => void;
  onTransfer: (a: MoneyAccountRow) => void;
}

export default function AccountRowActions({ account: a, onEdit, onDelete, onTransfer }: Props) {
  return (
    <Box sx={{ display: "flex" }} onClick={(e) => e.stopPropagation()}>
      <Tooltip title="Deposit">
        <IconButton size="small" component={NextLink} href={`/admin/money/entries?deposit=${a.id}`}>
          <PiggyBank size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Transfer from this account">
        <IconButton size="small" onClick={() => onTransfer(a)}>
          <ArrowLeftRight size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Edit">
        <IconButton size="small" onClick={() => onEdit(a)}>
          <Pencil size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" onClick={() => onDelete(a)}>
          <Trash2 size={14} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
