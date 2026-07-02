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
import type { PropertyExpense } from "@/types";
import { fmt } from "../utils";

interface PayeePaymentHistoryTableProps {
  expenses: PropertyExpense[];
  totalPaid: number;
}

export default function PayeePaymentHistoryTable({
  expenses,
  totalPaid,
}: PayeePaymentHistoryTableProps) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Payment History
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "error.main" }}>
            Total: {fmt(totalPaid)}
          </Typography>
        </Box>

        {expenses.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No payments recorded yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small" sx={mobileCardTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Service Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Amount</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Mode</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Notes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell data-label="Date">
                      {e.expenseDate
                        ? new Date(e.expenseDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : `${e.month}/${e.year}`}
                    </TableCell>
                    <TableCell data-label="Service Type">
                      {e.serviceTypeName ? (
                        <Chip label={e.serviceTypeName} size="small" sx={{ fontSize: "0.7rem" }} />
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          {e.category}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell data-label="Description">{e.description}</TableCell>
                    <TableCell data-label="Amount">
                      <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                        {fmt(e.amount)}
                      </Typography>
                    </TableCell>
                    <TableCell data-label="Mode">{e.paymentMode ?? "—"}</TableCell>
                    <TableCell data-label="Notes">
                      <Typography variant="caption" color="text.secondary">
                        {e.notes ?? "—"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
