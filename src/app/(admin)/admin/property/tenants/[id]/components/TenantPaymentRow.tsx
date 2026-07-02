import { Fragment } from "react";
import { Box, Chip, IconButton, TableCell, TableRow, Tooltip, Typography } from "@mui/material";
import { AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import type { PaymentWithTenant } from "@/types";
import { STATUS_COLORS, MONTH_LABELS, fmt, isBeforeMoveIn } from "../utils";
import PaymentTransactionLog from "./PaymentTransactionLog";
import PaymentRowActions from "./PaymentRowActions";

interface TenantPaymentRowProps {
  payment: PaymentWithTenant;
  moveInDate: string;
  expanded: boolean;
  onToggle: (pid: string) => void;
  onDelete: (pid: string, e: React.MouseEvent) => void;
  deleting: boolean;
}

export default function TenantPaymentRow({
  payment: p,
  moveInDate,
  expanded,
  onToggle,
  onDelete,
  deleting,
}: TenantPaymentRowProps) {
  const beforeMoveIn = isBeforeMoveIn(p.month, p.year, moveInDate);

  return (
    <Fragment>
      <TableRow hover sx={{ cursor: "pointer" }} onClick={() => onToggle(p.id)}>
        <TableCell sx={{ width: 32 }}>
          <IconButton size="small">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </IconButton>
        </TableCell>
        <TableCell data-label="Period">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2">
              {MONTH_LABELS[p.month - 1]} {p.year}
            </Typography>
            {beforeMoveIn && (
              <Tooltip title="This period is before the tenant's move-in date">
                <AlertTriangle size={13} color="var(--mui-palette-warning-main)" />
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell data-label="Rent Due">
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2">{fmt(p.rentDue)}</Typography>
            {p.carryForward > 0 && (
              <Tooltip
                title={`Includes ${fmt(p.carryForward)} carried forward from previous month`}
              >
                <Chip
                  label={`+${fmt(p.carryForward)} carry`}
                  size="small"
                  sx={{ bgcolor: "warning.main", color: "#fff", fontSize: "0.6rem", height: 16 }}
                />
              </Tooltip>
            )}
          </Box>
        </TableCell>
        <TableCell data-label="Cash Paid">{fmt(p.amountPaid)}</TableCell>
        <TableCell data-label="Advance Applied">
          {p.advanceApplied > 0 ? (
            <Typography variant="body2" color="primary.main">
              {fmt(p.advanceApplied)}
            </Typography>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell data-label="Balance">
          <Typography
            variant="body2"
            color={p.balance > 0 ? "error.main" : "success.main"}
            sx={{ fontWeight: 600 }}
          >
            {fmt(p.balance)}
          </Typography>
        </TableCell>
        <TableCell data-label="Status">
          <Chip
            label={p.status}
            size="small"
            sx={{
              bgcolor: STATUS_COLORS[p.status] ?? "text.secondary",
              color: p.status === "PENDING" ? "text.primary" : "#fff",
              fontWeight: 600,
              fontSize: "0.6875rem",
            }}
          />
        </TableCell>
        <TableCell data-label="Actions" sx={{ width: 80 }}>
          <PaymentRowActions paymentId={p.id} onDelete={onDelete} deleting={deleting} />
        </TableCell>
      </TableRow>

      <PaymentTransactionLog transactions={p.transactions} expanded={expanded} />
    </Fragment>
  );
}
