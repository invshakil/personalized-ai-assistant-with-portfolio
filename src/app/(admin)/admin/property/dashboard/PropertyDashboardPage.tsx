"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from "@mui/material";

import { TrendingUp, AlertTriangle, LogIn, LogOut } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { propertyApi } from "@/lib/api/property";
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
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState<PropertyDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await propertyApi.dashboard({ month, year })) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

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

          {/* Upcoming rent changes (full-width notice) */}
          {data.pendingRentChanges.length > 0 && (
            <Alert severity="info" icon={<TrendingUp size={18} />} sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Upcoming Rent Changes
              </Typography>
              {data.pendingRentChanges.map((rc) => (
                <Typography key={rc.id} variant="caption" sx={{ display: "block" }}>
                  {rc.tenantName}
                  {rc.unitNumber ? ` (${rc.unitNumber})` : ""}: {fmt(rc.previousRent)} →{" "}
                  {fmt(rc.newRent)} ({rc.increase >= 0 ? "+" : ""}
                  {fmt(rc.increase)}) from {new Date(rc.effectiveDate).toLocaleDateString()}
                  {rc.reason ? ` — ${rc.reason}` : ""}
                </Typography>
              ))}
            </Alert>
          )}

          {/* Tenant movements + outstanding dues — side by side */}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, alignItems: "flex-start" }}>
            {/* Tenant movements — recent & upcoming move-ins / move-outs */}
            {data.tenantMovements.length > 0 && (
              <Card sx={{ bgcolor: "background.paper", flex: "1 1 360px", minWidth: 0 }}>
                <CardContent>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    sx={{ fontWeight: 600, mb: 1.5 }}
                  >
                    Tenant Movements
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {data.tenantMovements.map((mv) => {
                      const isIn = mv.kind === "MOVE_IN";
                      const color = isIn ? "success.main" : "warning.main";
                      const verb = isIn
                        ? mv.timing === "upcoming"
                          ? "moving in"
                          : "moved in"
                        : mv.timing === "upcoming"
                          ? "moving out"
                          : "moved out";
                      return (
                        <Box
                          key={`${mv.kind}-${mv.tenantId}`}
                          sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                        >
                          <Box sx={{ color, display: "flex" }}>
                            {isIn ? <LogIn size={16} /> : <LogOut size={16} />}
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, flex: 1, minWidth: 0 }}
                          >
                            {mv.tenantName}
                            {mv.unitNumber ? ` · ${mv.unitNumber}` : ""}
                          </Typography>
                          {isIn && mv.isNew && (
                            <Chip
                              label="New"
                              size="small"
                              sx={{
                                bgcolor: "primary.main",
                                color: "#fff",
                                fontWeight: 600,
                                fontSize: "0.625rem",
                                height: 18,
                              }}
                            />
                          )}
                          <Typography variant="caption" sx={{ color }}>
                            {verb}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(mv.date).toLocaleDateString()}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Outstanding dues — compact list */}
            {data.topDue.length > 0 && (
              <Card sx={{ bgcolor: "background.paper", flex: "1 1 360px", minWidth: 0 }}>
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <AlertTriangle size={16} color="var(--mui-palette-warning-main)" />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Outstanding Dues
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                    {data.topDue.map((d) => (
                      <Box
                        key={d.tenantId}
                        sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {d.tenantName}
                            {d.unitNumber ? ` · ${d.unitNumber}` : ""}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {d.tenantCode ? `${d.tenantCode} · ` : ""}
                            {d.monthsUnpaid} {d.monthsUnpaid === 1 ? "month" : "months"} unpaid
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: "error.main" }}>
                          {fmt(d.totalDue)}
                        </Typography>
                        <Chip
                          label={d.alert === "OVERDUE" ? "Overdue" : "Pending"}
                          size="small"
                          sx={{
                            bgcolor: d.alert === "OVERDUE" ? "error.main" : "warning.main",
                            color: "#fff",
                            fontWeight: 600,
                            fontSize: "0.625rem",
                            height: 20,
                          }}
                        />
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>
            )}
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
