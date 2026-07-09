import { Fragment } from "react";
import { Chip, Collapse, IconButton, TableCell, TableRow, Typography } from "@mui/material";
import { ChevronDown, ChevronRight } from "lucide-react";
import EntityLink from "@/components/admin/EntityLink";
import type { PaymentTransaction, PaymentWithTenant } from "@/types";
import { MONTHS, STATUS_COLORS, fmt, type EditPaymentState } from "../types";
import PaymentRowActionButtons from "./PaymentRowActionButtons";
import TransactionLog from "./TransactionLog";

interface PaymentRowProps {
  payment: PaymentWithTenant;
  isAllMonths: boolean;
  expanded: boolean;
  onToggleExpand: (id: string) => void;
  onEdit: (state: EditPaymentState) => void;
  onRecordPayment: (payment: PaymentWithTenant) => void;
  onApplyAdvance: (payment: PaymentWithTenant) => void;
  onManageCharges: (payment: PaymentWithTenant) => void;
  onDelete: (id: string, tenantName: string) => void;
  onEditTx: (tx: PaymentTransaction) => void;
  onDeleteTx: (txId: string, isAdvance: boolean) => void;
}

export default function PaymentRow({
  payment: p,
  isAllMonths,
  expanded,
  onToggleExpand,
  onEdit,
  onRecordPayment,
  onApplyAdvance,
  onManageCharges,
  onDelete,
  onEditTx,
  onDeleteTx,
}: PaymentRowProps) {
  return (
    <Fragment>
      <TableRow hover>
        <TableCell sx={{ width: 32 }}>
          <IconButton size="small" onClick={() => onToggleExpand(p.id)}>
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </IconButton>
        </TableCell>
        <TableCell data-label="Tenant">
          <EntityLink href={`/admin/property/tenants/${p.tenantId}`} sx={{ fontWeight: 600 }}>
            {p.tenantName}
          </EntityLink>
          <Typography variant="caption" color="text.secondary">
            {p.tenantCode}
            {isAllMonths ? ` · ${MONTHS[p.month - 1]} ${p.year}` : ""}
          </Typography>
        </TableCell>
        <TableCell data-label="Unit">
          {p.unitId ? (
            <EntityLink href={`/admin/property/units/${p.unitId}`}>{p.unitNumber}</EntityLink>
          ) : (
            <Typography variant="body2">—</Typography>
          )}
        </TableCell>
        <TableCell data-label="Rent Due">{fmt(p.rentDue)}</TableCell>
        <TableCell data-label="Cash Paid">{fmt(p.amountPaid)}</TableCell>
        <TableCell data-label="Advance">
          {p.advanceApplied > 0 ? (
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 600 }}>
              {fmt(p.advanceApplied)}
            </Typography>
          ) : (
            "—"
          )}
        </TableCell>
        <TableCell data-label="Balance">
          <Typography
            variant="body2"
            sx={{ fontWeight: 600 }}
            color={p.balance > 0 ? "error.main" : "success.main"}
          >
            {fmt(p.balance)}
          </Typography>
        </TableCell>
        <TableCell data-label="Status">
          <Chip
            label={p.status}
            size="small"
            sx={{
              bgcolor: STATUS_COLORS[p.status]?.bg ?? "action.selected",
              color: STATUS_COLORS[p.status]?.color ?? "text.primary",
              fontWeight: 600,
              fontSize: "0.6875rem",
            }}
          />
        </TableCell>
        <TableCell data-label="Actions">
          <PaymentRowActionButtons
            payment={p}
            onEdit={onEdit}
            onRecordPayment={onRecordPayment}
            onApplyAdvance={onApplyAdvance}
            onManageCharges={onManageCharges}
            onDelete={onDelete}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
          <Collapse in={expanded}>
            <TransactionLog
              payment={p}
              onEdit={onEditTx}
              onDelete={onDeleteTx}
              onAddTransaction={onRecordPayment}
            />
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  );
}
