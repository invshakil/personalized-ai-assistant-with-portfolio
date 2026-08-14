import { Box } from "@mui/material";
import type { PropertyDashboardStats } from "@/types";
import { fmt } from "../format";
import StatCard from "./StatCard";

interface DashboardStatsRowProps {
  data: PropertyDashboardStats;
}

export default function DashboardStatsRow({ data }: DashboardStatsRowProps) {
  // Headline is cash actually received. The sub-line reports coverage (which does
  // count advance draw-down) and names the advance, so a month settled from a
  // tenant's advance never reads as if that cash came in this month.
  const settledPct =
    data.totalExpected > 0 ? Math.round((data.totalSettled / data.totalExpected) * 100) : 0;
  const sub =
    data.totalAdvanceApplied > 0
      ? `${settledPct}% settled · ${fmt(data.totalAdvanceApplied)} from advances`
      : `${settledPct}% collected`;

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
      <StatCard label="Rent Expected" value={fmt(data.totalExpected)} color="text.primary" />
      <StatCard
        label="Rent Collected"
        value={fmt(data.totalCollected)}
        color="success.main"
        sub={sub}
      />
      <StatCard label="Total Expenses" value={fmt(data.totalExpenses)} color="error.main" />
      <StatCard
        label="Net Profit"
        value={fmt(data.netProfit)}
        color={data.netProfit >= 0 ? "success.main" : "error.main"}
      />
    </Box>
  );
}
