import { TableCell, TableRow, Chip } from "@mui/material";
import type { ImportPreviewRow } from "@/lib/api/money";
import { fmt, fmtDate } from "../../format";

interface PreviewRowProps {
  row: ImportPreviewRow;
}

/** One row in the CSV preview table, with a status chip reflecting error/duplicate/ready. */
export default function PreviewRow({ row }: PreviewRowProps) {
  return (
    <TableRow>
      <TableCell>{row.rowNumber}</TableCell>
      <TableCell>{row.date ? fmtDate(row.date) : "—"}</TableCell>
      <TableCell>{row.direction ?? "—"}</TableCell>
      <TableCell align="right">{row.amount != null ? fmt(row.amount) : "—"}</TableCell>
      <TableCell>{row.categoryName ?? "—"}</TableCell>
      <TableCell>
        {row.error ? (
          <Chip size="small" color="error" label={row.error} variant="outlined" />
        ) : row.duplicate ? (
          <Chip size="small" color="warning" label="duplicate" variant="outlined" />
        ) : (
          <Chip size="small" color="success" label="ready" variant="outlined" />
        )}
      </TableCell>
    </TableRow>
  );
}
