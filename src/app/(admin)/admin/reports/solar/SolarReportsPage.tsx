"use client";

import { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  FormControl,
} from "@mui/material";
import { Sun, Leaf, BatteryCharging, Wallet } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { solarApi } from "@/lib/api/solar";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { SolarReport, SolarOverview, SolarWeather, SolarMonthRow } from "@/types";

type RangePreset = "1M" | "3M" | "6M" | "12M" | "ALL" | "MONTH";

const RANGE_MONTHS: Record<"1M" | "3M" | "6M" | "12M", number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "12M": 12,
};

const MONTH_NAMES = [
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

/**
 * Server-side from/to bounds for a preset (from = 1st of the first month).
 * "MONTH" filters to a single calendar month/year picked by the user.
 */
function rangeBounds(
  preset: RangePreset,
  pick: { month: number; year: number }
): { from?: string; to?: string } {
  if (preset === "ALL") return {};
  if (preset === "MONTH") {
    const m = String(pick.month).padStart(2, "0");
    return { from: `${pick.year}-${m}-01`, to: `${pick.year}-${m}-28` };
  }
  const months = RANGE_MONTHS[preset];
  const now = new Date();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));
  return { from: from.toISOString().slice(0, 10) };
}

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

/** Single stacked horizontal bar — solar / battery / grid. */
function SourceSplitBar({
  solarKwh,
  batteryKwh,
  gridKwh,
  height = 12,
}: {
  solarKwh: number;
  batteryKwh: number;
  gridKwh: number;
  height?: number;
}) {
  const total = Math.max(0, solarKwh + batteryKwh + gridKwh);
  if (total <= 0) {
    return (
      <Box
        sx={{
          height,
          borderRadius: height / 2,
          bgcolor: "action.hover",
        }}
      />
    );
  }
  const pct = (v: number) => (v / total) * 100;
  return (
    <Box
      sx={{
        display: "flex",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        bgcolor: "action.hover",
      }}
    >
      <Box sx={{ width: `${pct(solarKwh)}%`, bgcolor: "warning.main" }} />
      <Box sx={{ width: `${pct(batteryKwh)}%`, bgcolor: "primary.main" }} />
      <Box sx={{ width: `${pct(gridKwh)}%`, bgcolor: "info.main" }} />
    </Box>
  );
}

/** Small inline % bar for use inside a table cell. */
function InlineMeter({ pct, color = "success.main" }: { pct: number; color?: string }) {
  const v = Math.min(100, Math.max(0, pct));
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: "flex-end" }}>
      <Box
        sx={{
          width: 56,
          height: 6,
          borderRadius: 3,
          bgcolor: "action.hover",
          overflow: "hidden",
        }}
      >
        <Box sx={{ width: `${v}%`, height: "100%", bgcolor: color }} />
      </Box>
      <Typography variant="body2" sx={{ minWidth: 36, fontVariantNumeric: "tabular-nums" }}>
        {v.toFixed(0)}%
      </Typography>
    </Box>
  );
}

/** Sum source-split + totals across the months in view. */
function rangeTotals(months: SolarMonthRow[]) {
  return months.reduce(
    (acc, m) => {
      acc.generationKwh += m.generationKwh;
      acc.consumptionKwh += m.consumptionKwh;
      acc.gridImportKwh += m.gridImportKwh;
      acc.gridExportKwh += m.gridExportKwh;
      acc.fromSolarDirectKwh += m.fromSolarDirectKwh;
      acc.fromBatteryKwh += m.fromBatteryKwh;
      acc.fromGridKwh += m.fromGridKwh;
      acc.savings += m.savings;
      acc.wouldHaveCost += m.wouldHaveCost;
      acc.actualCost += m.actualCost;
      acc.co2AvoidedKg += m.co2AvoidedKg;
      return acc;
    },
    {
      generationKwh: 0,
      consumptionKwh: 0,
      gridImportKwh: 0,
      gridExportKwh: 0,
      fromSolarDirectKwh: 0,
      fromBatteryKwh: 0,
      fromGridKwh: 0,
      savings: 0,
      wouldHaveCost: 0,
      actualCost: 0,
      co2AvoidedKg: 0,
    }
  );
}

export default function SolarReportsPage() {
  const [report, setReport] = useState<SolarReport | null>(null);
  const [overview, setOverview] = useState<SolarOverview | null>(null);
  const [weather, setWeather] = useState<SolarWeather | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangePreset>("12M");
  const now = new Date();
  const [pickMonth, setPickMonth] = useState(now.getMonth() + 1);
  const [pickYear, setPickYear] = useState(now.getFullYear());

  // Overview (lifetime + payback) and weather load once — they don't depend on
  // the visible range.
  useEffect(() => {
    solarApi
      .overview()
      .then(setOverview)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load solar overview"));
    solarApi
      .weather()
      .then((w) => {
        setWeather(w);
        setWeatherError(null);
      })
      .catch((e) => {
        setWeather(null);
        setWeatherError(e instanceof Error ? e.message : "Failed to load weather");
      });
  }, []);

  // The report refetches whenever the range changes — a real API request with
  // from/to bounds, not a client-side slice.
  useEffect(() => {
    setLoading(true);
    setError(null);
    solarApi
      .report(rangeBounds(range, { month: pickMonth, year: pickYear }))
      .then(setReport)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load solar reports"))
      .finally(() => setLoading(false));
  }, [range, pickMonth, pickYear]);

  const money = (v: number) =>
    `${overview?.currency === "BDT" ? "৳" : ""}${Math.round(v).toLocaleString("en-US")}`;
  const kwh = (v: number) => `${Math.round(v).toLocaleString("en-US")} kWh`;

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
  const months = report!.months;
  const totals = rangeTotals(months);
  const sourceTotal = totals.fromSolarDirectKwh + totals.fromBatteryKwh + totals.fromGridKwh;
  const pctOf = (v: number) => (sourceTotal > 0 ? (v / sourceTotal) * 100 : 0);

  const installYear = pb.installDate
    ? new Date(pb.installDate).getUTCFullYear()
    : now.getFullYear();
  const yearOptions = [];
  for (let y = now.getFullYear(); y >= installYear; y--) yearOptions.push(y);

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
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 2,
            alignItems: "center",
            mb: { xs: 2, md: 3 },
          }}
        >
          <ToggleButtonGroup
            size="small"
            exclusive
            value={range}
            onChange={(_, v) => v && setRange(v)}
          >
            <ToggleButton value="1M">1M</ToggleButton>
            <ToggleButton value="3M">3M</ToggleButton>
            <ToggleButton value="6M">6M</ToggleButton>
            <ToggleButton value="12M">12M</ToggleButton>
            <ToggleButton value="ALL">All</ToggleButton>
            <ToggleButton value="MONTH">Month</ToggleButton>
          </ToggleButtonGroup>
          {range === "MONTH" && (
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <Select value={pickMonth} onChange={(e) => setPickMonth(Number(e.target.value))}>
                  {MONTH_NAMES.map((m, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {m}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <Select value={pickYear} onChange={(e) => setPickYear(Number(e.target.value))}>
                  {yearOptions.map((y) => (
                    <MenuItem key={y} value={y}>
                      {y}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </Box>
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
                  ? "Reached"
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
          value={kwh(overview.monthGenerationKwh)}
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
          value={kwh(overview.lifetimeGenerationKwh)}
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

      {/* Range summary — totals + power-source split (text-first, single stacked bar) */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
            Selected period — {months.length} month{months.length === 1 ? "" : "s"}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" },
              gap: 2,
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Generated
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "warning.main" }}>
                {kwh(totals.generationKwh)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Consumed
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {kwh(totals.consumptionKwh)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Grid imported
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "info.main" }}>
                {kwh(totals.gridImportKwh)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Grid exported
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {kwh(totals.gridExportKwh)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Saved
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "success.main" }}>
                {money(totals.savings)}
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, display: "block", mb: 1 }}
          >
            Where your power came from
          </Typography>
          <SourceSplitBar
            solarKwh={totals.fromSolarDirectKwh}
            batteryKwh={totals.fromBatteryKwh}
            gridKwh={totals.fromGridKwh}
            height={14}
          />
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 1.5,
              mt: 2,
            }}
          >
            <SourceLegendRow
              swatchColor="warning.main"
              label="Solar (direct)"
              kwh={totals.fromSolarDirectKwh}
              pct={pctOf(totals.fromSolarDirectKwh)}
            />
            <SourceLegendRow
              swatchColor="primary.main"
              label="From battery"
              kwh={totals.fromBatteryKwh}
              pct={pctOf(totals.fromBatteryKwh)}
            />
            <SourceLegendRow
              swatchColor="info.main"
              label="From grid"
              kwh={totals.fromGridKwh}
              pct={pctOf(totals.fromGridKwh)}
            />
          </Box>

          <Box
            sx={{
              mt: 3,
              pt: 2,
              borderTop: 1,
              borderColor: "divider",
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                Would have paid
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: "error.main" }}>
                {money(totals.wouldHaveCost)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                Actually paid
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {money(totals.actualCost)}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                CO₂ avoided
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 700, color: "success.main" }}>
                {Math.round(totals.co2AvoidedKg).toLocaleString("en-US")} kg
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Monthly table */}
      <Card sx={{ mb: 3 }}>
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
                  <TableCell
                    data-label="Generation"
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {kwh(m.generationKwh)}
                  </TableCell>
                  <TableCell
                    data-label="Consumption"
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {kwh(m.consumptionKwh)}
                  </TableCell>
                  <TableCell
                    data-label="Grid import"
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {kwh(m.gridImportKwh)}
                  </TableCell>
                  <TableCell
                    data-label="Without solar"
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {money(m.wouldHaveCost)}
                  </TableCell>
                  <TableCell
                    data-label="Actual"
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {money(m.actualCost)}
                  </TableCell>
                  <TableCell
                    data-label="Saved"
                    align="right"
                    sx={{
                      color: "success.main",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {money(m.savings)}
                  </TableCell>
                  <TableCell data-label="Self-suff." align="right">
                    <InlineMeter pct={m.selfSufficiencyPct} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Weather — bottom of page, forward-looking after all historical data */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Leaf size={16} />
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              7-Day Forecast & Expected Generation
            </Typography>
          </Box>
          {weather?.available && weather.days.length > 0 ? (
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
          ) : weatherError ? (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px dashed",
                borderColor: "error.main",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: "error.main" }}>
                  Weather forecast failed
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {weatherError}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Check that latitude/longitude are valid decimal degrees (e.g. 23.8103, 90.4125 for
                  Dhaka).
                </Typography>
              </Box>
              <Button
                component={Link}
                href="/admin/settings/solar"
                size="small"
                variant="outlined"
                color="error"
              >
                Fix in Solar settings
              </Button>
            </Box>
          ) : (
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px dashed",
                borderColor: "divider",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Location not set
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Set the plant&apos;s latitude and longitude in Solar settings to enable the 7-day
                  forecast and expected generation. For Dhaka: 23.8103, 90.4125.
                </Typography>
              </Box>
              <Button component={Link} href="/admin/settings/solar" size="small" variant="outlined">
                Open Solar settings
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

function SourceLegendRow({
  swatchColor,
  label,
  kwh,
  pct,
}: {
  swatchColor: string;
  label: string;
  kwh: number;
  pct: number;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: swatchColor }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {Math.round(kwh).toLocaleString("en-US")} kWh · {pct.toFixed(1)}%
        </Typography>
      </Box>
    </Box>
  );
}
