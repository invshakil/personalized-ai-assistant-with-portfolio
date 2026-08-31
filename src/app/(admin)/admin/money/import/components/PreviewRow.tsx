import { Box, TableCell, TableRow, Chip, Tooltip } from "@mui/material";
import type { ImportPreviewRow } from "@/lib/api/money";
import { fmt, fmtDate } from "../../format";

interface PreviewRowProps {
  row: ImportPreviewRow;
}

/**
 * A suggestion the model was sure about reads as a normal value; a shaky one is
 * marked so it draws the eye. The threshold is where "probably right" stops
 * being worth a second look.
 */
const CONFIDENT = 0.75;

/** One row in the CSV preview table, with a status chip reflecting error/duplicate/ready. */
export default function PreviewRow({ row }: PreviewRowProps) {
  const suggested = row.categorySource === "ai";
  const confidence = row.categoryConfidence ?? 0;

  return (
    <TableRow>
      <TableCell>{row.rowNumber}</TableCell>
      <TableCell>{row.date ? fmtDate(row.date) : "—"}</TableCell>
      <TableCell>{row.direction ?? "—"}</TableCell>
      <TableCell align="right">{row.amount != null ? fmt(row.amount) : "—"}</TableCell>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <span>{row.categoryName ?? "—"}</span>
          {suggested && (
            <Tooltip
              title={`Suggested from the description (${Math.round(confidence * 100)}% confident)`}
            >
              <Chip
                size="small"
                variant="outlined"
                color={confidence >= CONFIDENT ? "info" : "warning"}
                label={confidence >= CONFIDENT ? "AI" : "AI · check"}
                sx={{ height: 20, fontSize: 11 }}
              />
            </Tooltip>
          )}
        </Box>
      </TableCell>
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
