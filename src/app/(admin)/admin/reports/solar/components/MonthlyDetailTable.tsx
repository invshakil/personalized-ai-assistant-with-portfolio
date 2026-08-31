import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type { SolarMonthRow } from "@/types";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import MonthlyDetailRow from "./MonthlyDetailRow";

interface MonthlyDetailTableProps {
  months: SolarMonthRow[];
  currency?: string;
}

const COLUMNS = [
  "Generation",
  "Consumption",
  "Grid import",
  "Without solar",
  "Actual",
  "Saved",
  "Self-suff.",
];

/** Month-by-month breakdown, newest first. */
export default function MonthlyDetailTable({ months, currency }: MonthlyDetailTableProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
          Monthly detail
        </Typography>
        <Table size="small" sx={mobileCardTableSx}>
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              {COLUMNS.map((c) => (
                <TableCell key={c} align="right">
                  {c}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[...months].reverse().map((m) => (
              <MonthlyDetailRow key={m.month} row={m} currency={currency} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
