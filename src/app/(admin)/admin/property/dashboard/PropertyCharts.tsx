"use client";

import { Box } from "@mui/material";
import type { PropertyDashboardStats } from "@/types";
import FinancialOverviewCard from "./components/FinancialOverviewCard";
import YearlyTrendCard from "./components/YearlyTrendCard";

interface Props {
  data: PropertyDashboardStats;
  month: number;
  year: number;
}

export default function PropertyCharts({ data, month, year }: Props) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <FinancialOverviewCard data={data} month={month} year={year} />
      <YearlyTrendCard data={data.yearlyData} year={year} />
    </Box>
  );
}
