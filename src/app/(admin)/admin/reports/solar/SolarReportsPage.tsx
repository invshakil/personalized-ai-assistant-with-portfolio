"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Button,
  Chip,
} from "@mui/material";
import { Sun, Leaf, BatteryCharging, Wallet } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { solarApi } from "@/lib/api/solar";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { SolarReport, SolarOverview, SolarWeather } from "@/types";

const SolarCharts = dynamic(() => import("./SolarCharts"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} sx={{ bgcolor: "background.paper", height: 300 }} />
      ))}
    </Box>
  ),
});

type RangePreset = "6M" | "12M" | "ALL";

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card sx={{ bgcolor: "background.paper" }}>
      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, color: "text.secondary" }}>
          {icon}
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {label}
          </Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function SolarReportsPage() {
  const [report, setReport] = useState<SolarReport | null>(null);
  const [overview, setOverview] = useState<SolarOverview | null>(null);
  const [weather, setWeather] = useState<SolarWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangePreset>("12M");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [r, o] = await Promise.all([solarApi.report(), solarApi.overview()]);
      setReport(r);
      setOverview(o);
      // Weather is best-effort — never block the report on it.
      solarApi
        .weather()
        .then(setWeather)
        .catch(() => setWeather(null));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load solar reports");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const money = (v: number) =>
    `${overview?.currency === "BDT" ? "৳" : ""}${Math.round(v).toLocaleString("en-US")}`;

  const header = (
    <PageHeader title="Solar Reports" subtitle="Generation, savings, battery, and payback." />
  );

  if (loading) {
    return (
      <Box>
        {header}
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {header}
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // Empty state — not configured or nothing synced yet.
  if (!overview?.hasData) {
    return (
      <Box>
        {header}
        <Card>
          <CardContent sx={{ p: 4, textAlign: "center" }}>
            <Sun size={36} color="#ff9f43" style={{ marginBottom: 12 }} />
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
              No solar data yet
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 3, maxWidth: 460, mx: "auto" }}
            >
              {overview?.configured
                ? "Your SolisCloud credentials are set. Run a sync to pull your generation and energy data."
                : "Connect SolisCloud by setting SOLIS_KEY_ID / SOLIS_KEY_SECRET in .env.local, then sync."}
            </Typography>
            <Button component={Link} href="/admin/settings/solar" variant="contained">
              Go to Solar settings
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const pb = report!.payback;
  const pct = Math.min(100, Math.max(0, pb.percentRecovered));
  const months =
    range === "ALL" ? report!.months : report!.months.slice(-(range === "6M" ? 6 : 12));

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {header}
        <ToggleButtonGroup
          size="small"
          exclusive
          value={range}
          onChange={(_, v) => v && setRange(v)}
          sx={{ mb: { xs: 2, md: 3 } }}
        >
          <ToggleButton value="6M">6M</ToggleButton>
          <ToggleButton value="12M">12M</ToggleButton>
          <ToggleButton value="ALL">All</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Payback hero */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Investment payback — {money(pb.installCost)} system
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "primary.main" }}>
              {pb.percentRecovered.toFixed(1)}% recovered
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ my: 1.5, height: 10, borderRadius: 5 }}
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              mt: 1,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Saved so far
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {money(pb.cumulativeSavings)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Remaining
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {money(Math.max(0, pb.remaining))}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Avg / month
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {money(pb.avgMonthlySavings)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Break-even
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {pb.remaining <= 0
                  ? "Reached 🎉"
                  : pb.projectedBreakEvenDate
                    ? new Date(pb.projectedBreakEvenDate).toLocaleDateString("en-US", {
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Stat tiles */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <StatTile
          icon={<Sun size={16} />}
          label="This month"
          value={`${overview.monthGenerationKwh.toLocaleString("en-US")} kWh`}
          sub={`${overview.monthSelfSufficiencyPct.toFixed(0)}% self-sufficient`}
        />
        <StatTile
          icon={<Wallet size={16} />}
          label="Lifetime savings"
          value={money(overview.lifetimeSavings)}
          sub={`${money(overview.monthSavings)} this month`}
        />
        <StatTile
          icon={<Sun size={16} />}
          label="Lifetime generation"
          value={`${Math.round(overview.lifetimeGenerationKwh).toLocaleString("en-US")} kWh`}
        />
        <StatTile
          icon={<BatteryCharging size={16} />}
          label="Battery"
          value={
            overview.latestBatterySoc != null ? `${overview.latestBatterySoc.toFixed(0)}%` : "—"
          }
          sub="latest state of charge"
        />
      </Box>

      <SolarCharts months={months} currency={overview.currency} />

      {/* Weather */}
      {weather?.available && weather.days.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Leaf size={16} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                7-Day Forecast & Expected Generation
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 1 }}>
              {weather.days.map((d) => (
                <Box
                  key={d.date}
                  sx={{
                    minWidth: 96,
                    flexShrink: 0,
                    p: 1.5,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {new Date(d.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, my: 0.5 }}>
                    {d.description}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {d.tempMaxC != null ? `${Math.round(d.tempMaxC)}°` : "—"} ·{" "}
                    {d.cloudCoverPct != null ? `${Math.round(d.cloudCoverPct)}%☁` : ""}
                  </Typography>
                  {d.predictedGenerationKwh != null && (
                    <Chip
                      size="small"
                      label={`~${d.predictedGenerationKwh} kWh`}
                      sx={{ mt: 0.75, bgcolor: "rgba(255,159,67,0.15)", color: "warning.main" }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Monthly table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
            Monthly detail
          </Typography>
          <Table size="small" sx={mobileCardTableSx}>
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">Generation</TableCell>
                <TableCell align="right">Consumption</TableCell>
                <TableCell align="right">Grid import</TableCell>
                <TableCell align="right">Without solar</TableCell>
                <TableCell align="right">Actual</TableCell>
                <TableCell align="right">Saved</TableCell>
                <TableCell align="right">Self-suff.</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...months].reverse().map((m) => (
                <TableRow key={m.month}>
                  <TableCell data-label="Month">{m.label}</TableCell>
                  <TableCell data-label="Generation" align="right">
                    {m.generationKwh.toLocaleString("en-US")} kWh
                  </TableCell>
                  <TableCell data-label="Consumption" align="right">
                    {m.consumptionKwh.toLocaleString("en-US")} kWh
                  </TableCell>
                  <TableCell data-label="Grid import" align="right">
                    {m.gridImportKwh.toLocaleString("en-US")} kWh
                  </TableCell>
                  <TableCell data-label="Without solar" align="right">
                    {money(m.wouldHaveCost)}
                  </TableCell>
                  <TableCell data-label="Actual" align="right">
                    {money(m.actualCost)}
                  </TableCell>
                  <TableCell
                    data-label="Saved"
                    align="right"
                    sx={{ color: "success.main", fontWeight: 600 }}
                  >
                    {money(m.savings)}
                  </TableCell>
                  <TableCell data-label="Self-suff." align="right">
                    {m.selfSufficiencyPct.toFixed(0)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
