import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { PaymentTransaction, PaymentWithTenant } from "@/types";
import type { EditPaymentState } from "../types";
import PaymentRow from "./PaymentRow";

interface PaymentTableProps {
  payments: PaymentWithTenant[];
  isAllMonths: boolean;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onEdit: (state: EditPaymentState) => void;
  onRecordPayment: (payment: PaymentWithTenant) => void;
  onApplyAdvance: (payment: PaymentWithTenant) => void;
  onManageCharges: (payment: PaymentWithTenant) => void;
  onManageVouchers: (payment: PaymentWithTenant) => void;
  onDelete: (id: string, tenantName: string) => void;
  onEditTx: (tx: PaymentTransaction) => void;
  onDeleteTx: (txId: string, isAdvance: boolean) => void;
}

export default function PaymentTable({
  payments,
  isAllMonths,
  expanded,
  onToggleExpand,
  onEdit,
  onRecordPayment,
  onApplyAdvance,
  onManageCharges,
  onManageVouchers,
  onDelete,
  onEditTx,
  onDeleteTx,
}: PaymentTableProps) {
  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Rent Due</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Cash Paid</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Advance</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Balance</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">No payment records for this period</Typography>
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => (
              <PaymentRow
                key={p.id}
                payment={p}
                isAllMonths={isAllMonths}
                expanded={expanded.has(p.id)}
                onToggleExpand={onToggleExpand}
                onEdit={onEdit}
                onRecordPayment={onRecordPayment}
                onApplyAdvance={onApplyAdvance}
                onManageCharges={onManageCharges}
                onManageVouchers={onManageVouchers}
                onDelete={onDelete}
                onEditTx={onEditTx}
                onDeleteTx={onDeleteTx}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
