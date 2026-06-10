"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";

import { TrendingUp, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import type { PropertyDashboardStats } from "@/types";

const PropertyCharts = dynamic(() => import("./PropertyCharts"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", height: 280 }} />
      <Card sx={{ bgcolor: "background.paper", height: 280 }} />
    </Box>
  ),
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function fmt(n: number) {
  return `৳${n.toLocaleString()}`;
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card sx={{ flex: "1 1 140px", minWidth: 140, bgcolor: "background.paper" }}>
      <CardContent sx={{ py: "14px !important", px: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25 }}>
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function PropertyDashboardPage() {
  const now = new Date();
  const [mounted, setMounted] = useState(false);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<PropertyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/property/dashboard?month=${month}&year=${year}`);
      const json = await res.json();
      setData(json.data ?? null);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  if (!mounted) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

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
          {/* Monthly stat cards */}
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

          {/* Tenant stats */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <StatCard label="Active Tenants" value={String(data.activeTenantsCount)} />
            <StatCard
              label="Occupancy"
              value={`${data.occupiedUnits}/${data.totalUnits}`}
              sub={`${Math.round((data.occupiedUnits / Math.max(data.totalUnits, 1)) * 100)}% occupied`}
            />
            <StatCard
              label="Advance Held"
              value={fmt(data.totalAdvanceHeld)}
              sub={`${data.tenantsWithAdvance} tenants`}
              color="primary.main"
            />
            {data.overdueCount > 0 && (
              <StatCard
                label="Overdue"
                value={String(data.overdueCount)}
                color="error.main"
                sub="need attention"
              />
            )}
          </Box>

          <PropertyCharts data={data} month={month} year={year} />

          {/* Pending rent changes */}
          {data.pendingRentChanges.length > 0 && (
            <Alert severity="info" icon={<TrendingUp size={18} />} sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Pending Rent Changes
              </Typography>
              {data.pendingRentChanges.map((rc) => (
                <Typography key={rc.id} variant="caption" sx={{ display: "block" }}>
                  {(rc as { tenantName?: string }).tenantName ?? rc.tenantId}:{" "}
                  {fmt(rc.previousRent)} → {fmt(rc.newRent)} from{" "}
                  {new Date(rc.effectiveDate).toLocaleDateString()}
                  {rc.reason ? ` (${rc.reason})` : ""}
                </Typography>
              ))}
            </Alert>
          )}

          {/* Due tracker */}
          {data.topDue.length > 0 && (
            <Card sx={{ bgcolor: "background.paper" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <AlertTriangle size={16} color="var(--mui-palette-warning-main)" />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Outstanding Dues
                  </Typography>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Tenant</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Unit</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Total Due</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Months Unpaid</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Alert</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.topDue.map((d) => (
                        <TableRow key={d.tenantId} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {d.tenantName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {d.tenantCode}
                            </Typography>
                          </TableCell>
                          <TableCell>{d.unitNumber ?? "—"}</TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 700, color: "error.main" }}
                            >
                              {fmt(d.totalDue)}
                            </Typography>
                          </TableCell>
                          <TableCell>{d.monthsUnpaid}</TableCell>
                          <TableCell>
                            <Chip
                              label={d.alert}
                              size="small"
                              sx={{
                                bgcolor: d.alert === "OVERDUE" ? "error.main" : "warning.main",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.6875rem",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Typography color="text.secondary">No data available.</Typography>
      )}
    </Box>
  );
}
