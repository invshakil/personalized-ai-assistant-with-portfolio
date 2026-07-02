"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Card,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";

import PageHeader from "@/components/admin/PageHeader";
import { MONTHS } from "./format";
import { useDashboardData } from "./hooks/useDashboardData";
import DashboardStatsRow from "./components/DashboardStatsRow";
import TenantStatsRow from "./components/TenantStatsRow";
import PendingRentChangesAlert from "./components/PendingRentChangesAlert";
import TenantMovementsCard from "./components/TenantMovementsCard";
import OutstandingDuesCard from "./components/OutstandingDuesCard";

const PropertyCharts = dynamic(() => import("./PropertyCharts"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", height: 280 }} />
      <Card sx={{ bgcolor: "background.paper", height: 280 }} />
    </Box>
  ),
});

export default function PropertyDashboardPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const { data, loading, error } = useDashboardData(month, year);

  return (
    <Box>
      <PageHeader title="Property Dashboard" subtitle="Financial overview and analytics" />

      {/* Month/year selector */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Month</InputLabel>
          <Select label="Month" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[2025, 2026, 2027, 2028].map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <CircularProgress />
        </Box>
      ) : data ? (
        <>
          <DashboardStatsRow data={data} />
          <TenantStatsRow data={data} />

          <PropertyCharts data={data} month={month} year={year} />

          <PendingRentChangesAlert changes={data.pendingRentChanges} />

          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start" }}>
            <TenantMovementsCard movements={data.tenantMovements} />
            <OutstandingDuesCard topDue={data.topDue} />
          </Box>
        </>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <Typography color="text.secondary">No data available.</Typography>
      )}
    </Box>
  );
}
