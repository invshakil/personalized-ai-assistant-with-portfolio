import { Box, IconButton, Tooltip } from "@mui/material";
import { Download, FileDown, Pencil, Plus, ReceiptText, Trash2, Wallet } from "lucide-react";
import type { PaymentWithTenant } from "@/types";
import type { EditPaymentState } from "../types";

interface PaymentRowActionButtonsProps {
  payment: PaymentWithTenant;
  onEdit: (state: EditPaymentState) => void;
  onRecordPayment: (payment: PaymentWithTenant) => void;
  onApplyAdvance: (payment: PaymentWithTenant) => void;
  onManageCharges: (payment: PaymentWithTenant) => void;
  onDelete: (id: string, tenantName: string) => void;
}

export default function PaymentRowActionButtons({
  payment: p,
  onEdit,
  onRecordPayment,
  onApplyAdvance,
  onManageCharges,
  onDelete,
}: PaymentRowActionButtonsProps) {
  return (
    <Box sx={{ display: "flex", gap: 0.5 }}>
      <Tooltip title="Edit payment">
        <IconButton
          size="small"
          onClick={() =>
            onEdit({
              id: p.id,
              tenantName: p.tenantName,
              rentDue: String(p.rentDue),
              notes: p.notes ?? "",
            })
          }
        >
          <Pencil size={15} />
        </IconButton>
      </Tooltip>
      {p.balance > 0 && (
        <Tooltip title="Record Payment">
          <IconButton size="small" onClick={() => onRecordPayment(p)}>
            <Plus size={15} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="One-off charges (maintenance, repairs…)">
        <IconButton size="small" onClick={() => onManageCharges(p)}>
          <ReceiptText size={15} />
        </IconButton>
      </Tooltip>
      {p.advanceBalance > 0 && p.balance > 0 && (
        <Tooltip title="Apply Advance">
          <IconButton size="small" onClick={() => onApplyAdvance(p)}>
            <Wallet size={15} />
          </IconButton>
        </Tooltip>
      )}
      {p.receiptNumber && (
        <Tooltip title={`Download Receipt ${p.receiptNumber}`}>
          <IconButton
            size="small"
            component="a"
            href={`/api/admin/property/payments/${p.id}/receipt`}
            target="_blank"
          >
            <Download size={15} />
          </IconButton>
        </Tooltip>
      )}
      {p.receiptNumber && (
        <Tooltip title="Download Tenant Copy">
          <IconButton
            size="small"
            component="a"
            href={`/api/admin/property/payments/${p.id}/receipt?copy=tenant`}
            target="_blank"
          >
            <FileDown size={15} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title="Delete payment record">
        <IconButton size="small" color="error" onClick={() => onDelete(p.id, p.tenantName)}>
          <Trash2 size={15} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}
