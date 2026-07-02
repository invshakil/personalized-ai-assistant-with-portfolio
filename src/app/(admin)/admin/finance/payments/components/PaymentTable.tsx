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
import type { PaymentRow } from "../../types";
import PaymentTableRow from "./PaymentTableRow";

interface PaymentTableProps {
  payments: PaymentRow[];
  hasActiveFilters: boolean;
  onEdit: (p: PaymentRow) => void;
  onDelete: (id: string) => void;
  onDownloadReceipt: (id: string) => void;
}

export default function PaymentTable({
  payments,
  hasActiveFilters,
  onEdit,
  onDelete,
  onDownloadReceipt,
}: PaymentTableProps) {
  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small" sx={mobileCardTableSx}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Clients</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Amount
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {hasActiveFilters ? "No payments match these filters" : "No payments yet"}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            payments.map((p) => (
              <PaymentTableRow
                key={p.id}
                payment={p}
                onEdit={onEdit}
                onDelete={onDelete}
                onDownloadReceipt={onDownloadReceipt}
              />
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
