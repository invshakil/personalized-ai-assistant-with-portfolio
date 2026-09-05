import NextLink from "next/link";
import { Box, Chip, IconButton, Link, TableCell, TableRow, Tooltip } from "@mui/material";
import { Merge, Pencil, Trash2 } from "lucide-react";
import type { MoneyCategoryRow } from "@/types";

interface Props {
  category: MoneyCategoryRow;
  onEdit: (c: MoneyCategoryRow) => void;
  onMerge: (c: MoneyCategoryRow) => void;
  onDelete: (c: MoneyCategoryRow) => void;
}

export default function CategoryRow({ category: c, onEdit, onMerge, onDelete }: Props) {
  return (
    <TableRow hover>
      <TableCell data-label="Name" sx={{ fontWeight: 600 }}>
        <Link
          component={NextLink}
          href={`/admin/money/entries?category=${c.id}&period=all`}
          underline="hover"
          color="primary"
          title="View this category's entries in the ledger"
        >
          {c.name}
        </Link>
      </TableCell>
      <TableCell data-label="Kind">
        <Chip
          size="small"
          label={c.kind === "INCOME" ? "Income" : "Expense"}
          color={c.kind === "INCOME" ? "success" : "warning"}
          variant="outlined"
        />
      </TableCell>
      <TableCell align="right" data-label="Entries">
        {c.entryCount}
      </TableCell>
      <TableCell data-label="Actions">
        <Box sx={{ display: "flex" }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(c)}>
              <Pencil size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Merge into another category">
            <IconButton size="small" onClick={() => onMerge(c)}>
              <Merge size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(c)}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
