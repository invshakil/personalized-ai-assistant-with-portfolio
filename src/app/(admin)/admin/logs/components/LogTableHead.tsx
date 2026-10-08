import { TableCell, TableHead, TableRow, TableSortLabel } from "@mui/material";
import type { LogSortBy, SortDir } from "../types";

interface LogTableHeadProps {
  sortBy: LogSortBy;
  sortDir: SortDir;
  onToggleSort: (col: LogSortBy) => void;
}

const COLS: { key: LogSortBy; label: string }[] = [
  { key: "createdAt", label: "Time" },
  { key: "level", label: "Level" },
  { key: "source", label: "Source" },
];

export default function LogTableHead({ sortBy, sortDir, onToggleSort }: LogTableHeadProps) {
  return (
    <TableHead>
      <TableRow>
        {COLS.map((c) => (
          <TableCell key={c.key} sx={{ fontWeight: 700 }}>
            <TableSortLabel
              active={sortBy === c.key}
              direction={sortBy === c.key ? sortDir : "asc"}
              onClick={() => onToggleSort(c.key)}
            >
              {c.label}
            </TableSortLabel>
          </TableCell>
        ))}
        <TableCell sx={{ fontWeight: 700 }}>Message</TableCell>
      </TableRow>
    </TableHead>
  );
}
