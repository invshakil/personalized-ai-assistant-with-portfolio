import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { AlertTriangle } from "lucide-react";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { PaymentWithTenant } from "@/types";
import TenantPaymentRow from "./TenantPaymentRow";

interface PaymentHistoryTableProps {
  payments: PaymentWithTenant[];
  moveInDate: string;
  expandedPayments: Set<string>;
  onToggle: (pid: string) => void;
  onDelete: (pid: string, e: React.MouseEvent) => void;
  deletingPaymentId: string | null;
}

export default function PaymentHistoryTable({
  payments,
  moveInDate,
  expandedPayments,
  onToggle,
  onDelete,
  deletingPaymentId,
}: PaymentHistoryTableProps) {
  if (payments.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <AlertTriangle size={32} style={{ opacity: 0.3 }} />
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          No payment records yet
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell />
            <TableCell sx={{ fontWeight: 700 }}>Period</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Rent Due</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Cash Paid</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Advance Applied</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Balance</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
            <TableCell />
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((p) => (
            <TenantPaymentRow
              key={p.id}
              payment={p}
              moveInDate={moveInDate}
              expanded={expandedPayments.has(p.id)}
              onToggle={onToggle}
              onDelete={onDelete}
              deleting={deletingPaymentId === p.id}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
