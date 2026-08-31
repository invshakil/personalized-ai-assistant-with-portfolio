import { TableCell, TableRow } from "@mui/material";
import type { SolarMonthRow } from "@/types";
import { kwh, money } from "../format";
import InlineMeter from "./InlineMeter";

interface MonthlyDetailRowProps {
  row: SolarMonthRow;
  currency?: string;
}

// Figures line up in columns, so digits get tabular figures.
const num = { fontVariantNumeric: "tabular-nums" } as const;

/** One month in the detail table. `data-label` drives the mobile card layout. */
export default function MonthlyDetailRow({ row: m, currency }: MonthlyDetailRowProps) {
  return (
    <TableRow>
      <TableCell data-label="Month">{m.label}</TableCell>
      <TableCell data-label="Generation" align="right" sx={num}>
        {kwh(m.generationKwh)}
      </TableCell>
      <TableCell data-label="Consumption" align="right" sx={num}>
        {kwh(m.consumptionKwh)}
      </TableCell>
      <TableCell data-label="Grid import" align="right" sx={num}>
        {kwh(m.gridImportKwh)}
      </TableCell>
      <TableCell data-label="Without solar" align="right" sx={num}>
        {money(m.wouldHaveCost, currency)}
      </TableCell>
      <TableCell data-label="Actual" align="right" sx={num}>
        {money(m.actualCost, currency)}
      </TableCell>
      <TableCell
        data-label="Saved"
        align="right"
        sx={{ ...num, color: "success.main", fontWeight: 600 }}
      >
        {money(m.savings, currency)}
      </TableCell>
      <TableCell data-label="Self-suff." align="right">
        <InlineMeter pct={m.selfSufficiencyPct} />
      </TableCell>
    </TableRow>
  );
}
