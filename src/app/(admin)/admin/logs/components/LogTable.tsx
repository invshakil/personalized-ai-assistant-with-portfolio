import {
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import type { LogRow as LogRowData } from "@/types";
import LogTableHead from "./LogTableHead";
import LogRow from "./LogRow";
import type { LogSortBy, SortDir } from "../types";

interface LogTableProps {
  rows: LogRowData[];
  loading: boolean;
  sortBy: LogSortBy;
  sortDir: SortDir;
  openId: string | null;
  onToggleSort: (col: LogSortBy) => void;
  onToggleOpen: (id: string) => void;
  onFilter: (patch: Record<string, string>) => void;
}

export default function LogTable(p: LogTableProps) {
  if (p.loading && p.rows.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Table size="small">
        <LogTableHead sortBy={p.sortBy} sortDir={p.sortDir} onToggleSort={p.onToggleSort} />
        <TableBody>
          {p.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4}>
                <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                  No log entries match.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            p.rows.map((r) => (
              <LogRow
                key={r.id}
                row={r}
                open={p.openId === r.id}
                onToggle={() => p.onToggleOpen(r.id)}
                onFilter={p.onFilter}
              />
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );
}
