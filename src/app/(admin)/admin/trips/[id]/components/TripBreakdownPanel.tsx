import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { TripCurrencyBreakdown, TripDaySpend } from "@/types";
import { fmt, fmtCurrency, fmtDate } from "../../format";

interface Props {
  byCurrency: TripCurrencyBreakdown[];
  byDay: TripDaySpend[];
}

export default function TripBreakdownPanel({ byCurrency, byDay }: Props) {
  return (
    <Card variant="outlined" sx={{ p: 2, flex: "1 1 320px", minWidth: 300 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Spending by currency
      </Typography>
      {byCurrency.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          No spending yet.
        </Typography>
      ) : (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Currency</TableCell>
              <TableCell align="right">Original</TableCell>
              <TableCell align="right">BDT</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byCurrency.map((c) => (
              <TableRow key={c.currency}>
                <TableCell>{c.currency}</TableCell>
                <TableCell align="right">{fmtCurrency(c.originalAmount, c.currency)}</TableCell>
                <TableCell align="right">{fmt(c.bdt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {byDay.length > 0 && (
        <>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
            Daily spend
          </Typography>
          <Box sx={{ maxHeight: 180, overflowY: "auto" }}>
            {byDay.map((d) => (
              <Box key={d.date} sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {fmtDate(d.date)}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {fmt(d.bdt)}
                </Typography>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Card>
  );
}
