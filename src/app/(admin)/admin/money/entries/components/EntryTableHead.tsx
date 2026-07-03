import { TableCell, TableHead, TableRow, TableSortLabel } from "@mui/material";
import type { SortBy, SortDir } from "../types";

interface EntryTableHeadProps {
  sortBy: SortBy;
  sortDir: SortDir;
  onToggleSort: (col: SortBy) => void;
}

export default function EntryTableHead({ sortBy, sortDir, onToggleSort }: EntryTableHeadProps) {
  return (
    <TableHead>
      <TableRow>
        <TableCell sx={{ fontWeight: 700 }}>
          <TableSortLabel
            active={sortBy === "date"}
            direction={sortBy === "date" ? sortDir : "desc"}
            onClick={() => onToggleSort("date")}
          >
            Date
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>
          <TableSortLabel
            active={sortBy === "category"}
            direction={sortBy === "category" ? sortDir : "asc"}
            onClick={() => onToggleSort("category")}
          >
            Category
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
        <TableCell align="right" sx={{ fontWeight: 700 }}>
          <TableSortLabel
            active={sortBy === "amount"}
            direction={sortBy === "amount" ? sortDir : "desc"}
            onClick={() => onToggleSort("amount")}
          >
            Amount
          </TableSortLabel>
        </TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
        <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
      </TableRow>
    </TableHead>
  );
}
