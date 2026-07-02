import { Box } from "@mui/material";
import type { FinanceDashboardData } from "../types";
import { fmt, fmtPct } from "../format";
import StatCard from "./StatCard";

interface FinanceTotalsRowProps {
  totals: FinanceDashboardData["totals"];
}

export default function FinanceTotalsRow({ totals }: FinanceTotalsRowProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
      <StatCard label="Total Income" value={fmt(totals.income)} color="info.main" />
      <StatCard label="Employee Costs" value={fmt(totals.empCosts)} color="warning.main" />
      <StatCard label="Tools / Subscriptions" value={fmt(totals.toolSubs)} color="warning.main" />
      <StatCard label="Net Profit" value={fmt(totals.netProfit)} color="success.main" />
      <StatCard label="Profit Margin" value={fmtPct(totals.margin)} color="primary.main" />
    </Box>
  );
}
