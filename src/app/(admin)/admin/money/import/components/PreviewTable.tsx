import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { ImportPreviewRow } from "@/lib/api/money";
import PreviewRow from "./PreviewRow";

const MAX_VISIBLE_ROWS = 100;

interface PreviewTableProps {
  rows: ImportPreviewRow[];
}

/** Scrollable table of previewed CSV rows, capped at the first 100 for display. */
export default function PreviewTable({ rows }: PreviewTableProps) {
  return (
    <>
      <TableContainer sx={{ maxHeight: 360, mb: 2 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Dir</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>
                Amount
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(0, MAX_VISIBLE_ROWS).map((r) => (
              <PreviewRow key={r.rowNumber} row={r} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > MAX_VISIBLE_ROWS && (
        <Typography variant="caption" color="text.secondary">
          Showing first {MAX_VISIBLE_ROWS} of {rows.length} rows. All valid rows will be imported.
        </Typography>
      )}
    </>
  );
}
