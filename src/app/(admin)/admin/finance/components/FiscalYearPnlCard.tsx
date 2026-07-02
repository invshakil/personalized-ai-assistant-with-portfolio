import {
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
import type { FinanceDashboardData } from "../types";
import { fmt, fmtPct } from "../format";

interface FiscalYearPnlCardProps {
  pnl: FinanceDashboardData["pnl"];
}

export default function FiscalYearPnlCard({ pnl }: FiscalYearPnlCardProps) {
  return (
    <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
          Business Performance by Fiscal Year
        </Typography>
        <TableContainer>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Fiscal Year</TableCell>
                <TableCell align="right">Income</TableCell>
                <TableCell align="right">Emp Costs</TableCell>
                <TableCell align="right">Tools/Subs</TableCell>
                <TableCell align="right">Net Profit</TableCell>
                <TableCell align="right">Margin</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pnl.map((r) => (
                <TableRow key={r.fiscalYear} hover>
                  <TableCell data-label="Fiscal Year" sx={{ fontWeight: 600 }}>
                    {r.fiscalYear}
                  </TableCell>
                  <TableCell align="right" data-label="Income">
                    {fmt(r.income)}
                  </TableCell>
                  <TableCell align="right" data-label="Emp Costs" sx={{ color: "warning.main" }}>
                    {fmt(r.empCosts)}
                  </TableCell>
                  <TableCell align="right" data-label="Tools/Subs" sx={{ color: "warning.main" }}>
                    {fmt(r.toolSubs)}
                  </TableCell>
                  <TableCell
                    align="right"
                    data-label="Net Profit"
                    sx={{ color: "success.main", fontWeight: 600 }}
                  >
                    {fmt(r.netProfit)}
                  </TableCell>
                  <TableCell align="right" data-label="Margin">
                    <Chip
                      size="small"
                      label={fmtPct(r.margin)}
                      color={r.margin >= 0.5 ? "success" : r.margin >= 0 ? "warning" : "error"}
                      variant="outlined"
                    />
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
