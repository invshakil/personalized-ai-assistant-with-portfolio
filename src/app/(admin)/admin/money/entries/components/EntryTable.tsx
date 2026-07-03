import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyEntryRow } from "@/types";
import type { SortBy, SortDir } from "../types";
import EntryTableHead from "./EntryTableHead";
import EntryTableRow from "./EntryTableRow";

interface EntryTableProps {
  entries: MoneyEntryRow[];
  hasActiveFilters: boolean;
  hasCustomRange: boolean;
  sortBy: SortBy;
  sortDir: SortDir;
  accountName: (id: string | null) => string;
  onToggleSort: (col: SortBy) => void;
  onEdit: (e: MoneyEntryRow) => void;
  onDelete: (id: string) => void;
}

export default function EntryTable({
  entries,
  hasActiveFilters,
  hasCustomRange,
  sortBy,
  sortDir,
  accountName,
  onToggleSort,
  onEdit,
  onDelete,
}: EntryTableProps) {
  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <EntryTableHead sortBy={sortBy} sortDir={sortDir} onToggleSort={onToggleSort} />
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {hasActiveFilters || hasCustomRange
                    ? "No entries match these filters"
                    : "No entries in this period"}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            entries.map((e) => (
              <EntryTableRow
                key={e.id}
                entry={e}
                accountName={accountName}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
