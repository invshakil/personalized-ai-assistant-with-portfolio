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
import { fmt, fmtDate } from "../../format";
import type { MoneyEntryRow } from "@/types";

interface Props {
  payments: MoneyEntryRow[];
}

export default function PaymentHistoryTable({ payments }: Props) {
  if (payments.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No payments recorded.
      </Typography>
    );
  }

  return (
    <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Direction</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>
              Amount
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payments.map((p) => (
            <TableRow key={p.id}>
              <TableCell>{fmtDate(p.date)}</TableCell>
              <TableCell>{p.direction === "DEBIT" ? "I paid" : "They paid"}</TableCell>
              <TableCell
                align="right"
                sx={{
                  fontWeight: 600,
                  color: p.direction === "DEBIT" ? "error.main" : "success.main",
                }}
              >
                {fmt(p.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
