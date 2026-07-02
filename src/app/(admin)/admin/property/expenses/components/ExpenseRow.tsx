import { Box, Chip, IconButton, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { Pencil, Trash2 } from "lucide-react";
import type { PropertyExpense } from "@/types";
import { CAT_COLORS, CAT_LABELS, MONTHS, fmt } from "../types";

interface ExpenseRowProps {
  expense: PropertyExpense;
  onEdit: (e: PropertyExpense) => void;
  onDelete: (id: string) => void;
  onPayeeClick: (payeeId: string) => void;
}

export default function ExpenseRow({
  expense: e,
  onEdit,
  onDelete,
  onPayeeClick,
}: ExpenseRowProps) {
  return (
    <TableRow hover>
      <TableCell data-label="Date">
        <Typography variant="body2">
          {e.expenseDate
            ? new Date(e.expenseDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
              })
            : `${MONTHS[e.month - 1]} ${e.year}`}
        </Typography>
      </TableCell>
      <TableCell data-label="Category">
        <Chip
          label={CAT_LABELS[e.category]}
          size="small"
          sx={{ bgcolor: CAT_COLORS[e.category], color: "#fff", fontSize: "0.6875rem" }}
        />
      </TableCell>
      <TableCell data-label="Service Type">
        {e.serviceTypeName ? (
          <Chip
            label={e.serviceTypeName}
            size="small"
            variant="outlined"
            sx={{ fontSize: "0.7rem" }}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            —
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Description">
        <Typography variant="body2">{e.description}</Typography>
      </TableCell>
      <TableCell data-label="Amount">
        <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>
          {fmt(e.amount)}
        </Typography>
      </TableCell>
      <TableCell data-label="Payee">
        {e.payeeId ? (
          <Chip
            label={e.payeeName ?? "—"}
            size="small"
            clickable
            sx={{ fontSize: "0.7rem", cursor: "pointer" }}
            onClick={() => onPayeeClick(e.payeeId!)}
          />
        ) : (
          <Typography variant="caption" color="text.secondary">
            {e.paidTo ?? "—"}
          </Typography>
        )}
      </TableCell>
      <TableCell data-label="Mode">{e.paymentMode ?? "—"}</TableCell>
      <TableCell data-label="Notes">
        <Typography variant="caption" color="text.secondary">
          {e.notes ?? "—"}
        </Typography>
      </TableCell>
      <TableCell data-label="Actions">
        <Box sx={{ display: "flex" }}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(e)}>
              <Pencil size={14} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => onDelete(e.id)}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
    </TableRow>
  );
}
