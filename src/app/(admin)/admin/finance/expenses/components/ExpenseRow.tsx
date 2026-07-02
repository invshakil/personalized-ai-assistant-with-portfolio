import { Box, Chip, IconButton, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { Pencil, Trash2, Download } from "lucide-react";
import type { BizExpenseRow } from "../../types";
import { fmt, fmtDate } from "../../format";

interface ExpenseRowProps {
  expense: BizExpenseRow;
  onEdit: (e: BizExpenseRow) => void;
  onDelete: (id: string) => void;
  onCategoryClick: (categoryId: string) => void;
}

export default function ExpenseRow({
  expense: e,
  onEdit,
  onDelete,
  onCategoryClick,
}: ExpenseRowProps) {
  return (
    <TableRow hover>
      <TableCell data-label="Date">{fmtDate(e.date)}</TableCell>
      <TableCell data-label="Tool / Service" sx={{ fontWeight: 600 }}>
        {e.name}
      </TableCell>
      <TableCell data-label="Category">
        <Chip
          size="small"
          label={e.categoryName}
          variant="outlined"
          clickable
          onClick={() => onCategoryClick(e.categoryId)}
        />
      </TableCell>
      <TableCell data-label="Recurring">
        {e.subscriptionId ? (
          <Chip size="small" label="Subscription" color="primary" variant="outlined" />
        ) : e.isRecurring ? (
          <Chip size="small" label="Recurring" color="info" variant="outlined" />
        ) : (
          <Typography variant="caption" color="text.secondary">
            One-off
          </Typography>
        )}
      </TableCell>
      <TableCell align="right" data-label="Amount" sx={{ fontWeight: 600, color: "error.main" }}>
        {fmt(e.amount)}
      </TableCell>
      <TableCell data-label="Fiscal Year">{e.fiscalYear}</TableCell>
      <TableCell data-label="Actions">
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Tooltip title="Download voucher">
            <IconButton
              size="small"
              onClick={() => window.open(`/api/admin/finance/expenses/${e.id}/receipt`, "_blank")}
            >
              <Download size={14} />
            </IconButton>
          </Tooltip>
          {e.subscriptionId ? (
            <Tooltip title="Managed on the Subscriptions page">
              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                via subscription
              </Typography>
            </Tooltip>
          ) : (
            <>
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
            </>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}
