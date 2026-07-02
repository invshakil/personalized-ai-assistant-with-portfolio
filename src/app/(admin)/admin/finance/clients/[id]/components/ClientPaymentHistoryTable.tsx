import {
  Box,
  Card,
  CardContent,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import EntityLink from "@/components/admin/EntityLink";
import { fmt, fmtDate } from "../../../format";
import type { PaymentRow } from "../../../types";
import { KIND_LABEL } from "../../../payments/types";

interface ClientPaymentHistoryTableProps {
  payments: PaymentRow[];
}

export default function ClientPaymentHistoryTable({ payments }: ClientPaymentHistoryTableProps) {
  if (payments.length === 0) return null;

  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Salary Payments Involving This Client
          </Typography>
        </Box>

        <TableContainer>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell data-label="Date">{fmtDate(p.date)}</TableCell>
                  <TableCell data-label="Employee">
                    <EntityLink href={`/admin/finance/employees/${p.employeeId}`}>
                      {p.employeeName}
                    </EntityLink>
                  </TableCell>
                  <TableCell data-label="Type">
                    <Chip size="small" label={KIND_LABEL[p.type]} variant="outlined" />
                  </TableCell>
                  <TableCell align="right" data-label="Amount" sx={{ fontWeight: 600 }}>
                    {fmt(p.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
