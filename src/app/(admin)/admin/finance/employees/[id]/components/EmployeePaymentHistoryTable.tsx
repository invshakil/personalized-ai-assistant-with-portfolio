import {
  Box,
  Card,
  CardContent,
  Chip,
  Stack,
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

interface EmployeePaymentHistoryTableProps {
  payments: PaymentRow[];
  totalPaid: number;
}

export default function EmployeePaymentHistoryTable({
  payments,
  totalPaid,
}: EmployeePaymentHistoryTableProps) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Payment History
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "warning.main" }}>
            Total: {fmt(totalPaid)}
          </Typography>
        </Box>

        {payments.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No payments recorded yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small" sx={mobileCardTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Clients</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell data-label="Date">{fmtDate(p.date)}</TableCell>
                    <TableCell data-label="Type">
                      <Chip size="small" label={KIND_LABEL[p.type]} variant="outlined" />
                    </TableCell>
                    <TableCell data-label="Clients">
                      {p.clients.length > 0 ? (
                        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                          {p.clients.map((c) => (
                            <EntityLink key={c.id} href={`/admin/finance/clients/${c.id}`} inline>
                              {c.name}
                            </EntityLink>
                          ))}
                        </Stack>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell align="right" data-label="Amount" sx={{ fontWeight: 600 }}>
                      {fmt(p.amount)}
                    </TableCell>
                    <TableCell data-label="Fiscal Year">{p.fiscalYear}</TableCell>
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
