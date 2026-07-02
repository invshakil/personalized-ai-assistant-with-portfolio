import { Box } from "@mui/material";
import type { PropertyDashboardStats } from "@/types";
import { fmt } from "../format";
import StatCard from "./StatCard";

interface DashboardStatsRowProps {
  data: PropertyDashboardStats;
}

export default function DashboardStatsRow({ data }: DashboardStatsRowProps) {
  return (
    <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
      <StatCard label="Rent Expected" value={fmt(data.totalExpected)} color="text.primary" />
      <StatCard
        label="Rent Collected"
        value={fmt(data.totalCollected)}
        color="success.main"
        sub={`${data.totalExpected > 0 ? Math.round((data.totalCollected / data.totalExpected) * 100) : 0}% collected`}
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
