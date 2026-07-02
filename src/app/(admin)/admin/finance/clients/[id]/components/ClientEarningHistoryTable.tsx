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
import { fmt, fmtDate } from "../../../format";
import type { EarningRow } from "../../../types";
import { REMITTANCE_LABEL } from "../../../earnings/types";

interface ClientEarningHistoryTableProps {
  earnings: EarningRow[];
  totalEarned: number;
}

export default function ClientEarningHistoryTable({
  earnings,
  totalEarned,
}: ClientEarningHistoryTableProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Earnings
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "success.main" }}>
            Total: {fmt(totalEarned)}
          </Typography>
        </Box>

        {earnings.length === 0 ? (
          <Typography variant="caption" color="text.secondary">
            No earnings recorded yet.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small" sx={mobileCardTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>
                    Amount
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Fiscal Year</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {earnings.map((e) => (
                  <TableRow key={e.id} hover>
                    <TableCell data-label="Date">{fmtDate(e.date)}</TableCell>
                    <TableCell data-label="Type">
                      <Chip
                        size="small"
                        label={REMITTANCE_LABEL[e.remittance]}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right" data-label="Amount" sx={{ fontWeight: 600 }}>
                      {fmt(e.amount)}
                    </TableCell>
                    <TableCell data-label="Fiscal Year">{e.fiscalYear}</TableCell>
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
