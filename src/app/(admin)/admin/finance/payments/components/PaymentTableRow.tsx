import {
  Box,
  Chip,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import { Pencil, Trash2, Download } from "lucide-react";
import type { PaymentRow } from "../../types";
import { fmt, fmtDate, fmtForeign } from "../../format";
import { KIND_LABEL } from "../types";

interface PaymentTableRowProps {
  payment: PaymentRow;
  onEdit: (p: PaymentRow) => void;
  onDelete: (id: string) => void;
  onDownloadReceipt: (id: string) => void;
}

export default function PaymentTableRow({
  payment: p,
  onEdit,
  onDelete,
  onDownloadReceipt,
}: PaymentTableRowProps) {
  return (
    <TableRow hover>
      <TableCell data-label="Date">{fmtDate(p.date)}</TableCell>
      <TableCell data-label="Employee">{p.employeeName}</TableCell>
      <TableCell data-label="Type">
        <Chip
          size="small"
          label={KIND_LABEL[p.type]}
          color={p.type === "SALARY" ? "primary" : p.type === "BONUS" ? "success" : "default"}
          variant="outlined"
        />
      </TableCell>
      <TableCell data-label="Clients">
        {p.clients.length > 0 ? (
          <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {p.clients.map((c) => (
              <Chip key={c.id} size="small" label={c.name} variant="outlined" />
            ))}
          </Stack>
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
        {p.reference && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: p.clients.length ? 0.5 : 0 }}
          >
            {p.reference}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right" data-label="Amount" sx={{ fontWeight: 600, color: "warning.main" }}>
        {fmt(p.amount)}
        {p.currency !== "BDT" && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", fontWeight: 400 }}
          >
            {fmtForeign(p.currency, p.originalAmount, p.fxRate)}
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Fiscal Year">{p.fiscalYear}</TableCell>
      <TableCell data-label="Actions">
        <Box sx={{ display: "flex" }}>
          <Tooltip title="Download salary receipt">
            <IconButton size="small" onClick={() => onDownloadReceipt(p.id)}>
              <Download size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(p)}>
              <Pencil size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(p.id)}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
