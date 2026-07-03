import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
} from "@mui/material";
import { Trash2, FileText } from "lucide-react";
import type { ImportBatchRow } from "@/lib/api/money";
import { fmtDate } from "../../format";

interface PastImportsCardProps {
  batches: ImportBatchRow[];
  onDelete: (batch: ImportBatchRow) => void;
}

/** History of prior CSV imports, with a per-batch rollback (delete) action. */
export default function PastImportsCard({ batches, onDelete }: PastImportsCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
          Past imports
        </Typography>
        {batches.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No imports yet.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>File</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Imported</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Rows
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Undo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {batches.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <FileText size={14} />
                      {b.fileName}
                    </Box>
                  </TableCell>
                  <TableCell>{fmtDate(b.importedAt)}</TableCell>
                  <TableCell align="right">{b.currentEntryCount}</TableCell>
                  <TableCell>
                    <Tooltip title="Delete this batch's entries (rollback)">
                      <IconButton size="small" color="error" onClick={() => onDelete(b)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
