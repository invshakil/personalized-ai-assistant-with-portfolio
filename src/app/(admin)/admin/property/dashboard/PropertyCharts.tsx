"use client";

import { Card, CardContent, Typography, Box, LinearProgress } from "@mui/material";
import type { PropertyDashboardStats } from "@/types";

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
  return `৳${Math.round(n).toLocaleString()}`;
}

/** A labelled value with a proportional bar beneath it. */
function BarRow({
  label,
  value,
  pct,
  color = "primary.main",
  note,
}: {
  label: string;
  value: string;
  pct: number; // 0–100
  color?: string;
  note?: string;
}) {
  return (
    <Box sx={{ mb: 1.75 }}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.5 }}
      >
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700, color }}>
          {value}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.max(0, Math.min(100, pct))}
        sx={{
          height: 8,
          borderRadius: 4,
          bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
        }}
      />
      {note && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {note}
        </Typography>
      )}
    </Box>
  );
}

/** A single mini-bar (used for the per-month yearly trend rows). */
function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <LinearProgress
      variant="determinate"
      value={Math.max(0, Math.min(100, pct))}
      sx={{
        height: 5,
        borderRadius: 3,
        bgcolor: "action.hover",
        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
      }}
    />
  );
}

/** A compact bordered stat tile (used to fill the financial overview footer). */
function MiniStat({
  label,
  value,
  sub,
  color = "text.primary",
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: "divider",
        borderRadius: 1.5,
        px: 1.75,
        py: 1.25,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
        {label}
      </Typography>
      <Typography variant="h6" sx={{ fontWeight: 700, color, lineHeight: 1.3 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </Box>
  );
}

interface Props {
  data: PropertyDashboardStats;
  month: number;
  year: number;
}

export default function PropertyCharts({ data, month, year }: Props) {
  const { totalExpected, totalCollected, totalExpenses, netProfit } = data;
  const collectionPct = totalExpected > 0 ? (totalCollected / totalExpected) * 100 : 0;
  const uncollected = Math.max(0, totalExpected - totalCollected);
  // Expenses shown relative to what was collected (how much of income they ate).
  const expensePct = totalCollected > 0 ? (totalExpenses / totalCollected) * 100 : 0;

  const activeMonths = data.yearlyData.filter((m) => m.collected > 0 || m.expenses > 0);
  const yearMax = activeMonths.reduce((mx, m) => Math.max(mx, m.collected, m.expenses), 0);
  const yearCollected = data.yearlyData.reduce((s, m) => s + m.collected, 0);
  const yearExpenses = data.yearlyData.reduce((s, m) => s + m.expenses, 0);

  // Derived footer stats.
  const netMargin = totalCollected > 0 ? Math.round((netProfit / totalCollected) * 100) : 0;
  const ytdNet = yearCollected - yearExpenses;
  const profitableMonths = data.yearlyData.filter((m) => m.netProfit > 0).length;
  const activeMonthCount = activeMonths.length;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      {/* Financial Overview — text + bars */}
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            {MONTHS[month - 1]} {year} — Financial Overview
          </Typography>

          <BarRow
            label="Rent collected"
            value={`${fmt(totalCollected)} / ${fmt(totalExpected)}`}
            pct={collectionPct}
            color="success.main"
            note={
              totalExpected > 0
                ? `${Math.round(collectionPct)}% collected · ${fmt(uncollected)} outstanding`
                : "No rent expected this month"
            }
          />

          <BarRow
            label="Expenses"
            value={fmt(totalExpenses)}
            pct={expensePct}
            color="error.main"
            note={
              totalCollected > 0
                ? `${Math.round(expensePct)}% of collected rent`
                : "No income recorded yet"
            }
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              mt: 2,
              pt: 1.5,
              borderTop: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Net profit
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, color: netProfit >= 0 ? "success.main" : "error.main" }}
            >
              {fmt(netProfit)}
            </Typography>
          </Box>

          {/* Derived stats — fill the footer with insight not shown above */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 2 }}>
            <MiniStat
              label="Net margin"
              value={`${netMargin}%`}
              sub="of collected rent kept"
              color={netMargin >= 0 ? "success.main" : "error.main"}
            />
            <MiniStat
              label={`Profit · ${year} to date`}
              value={fmt(ytdNet)}
              sub={
                activeMonthCount > 0
                  ? `${profitableMonths}/${activeMonthCount} months in profit`
                  : "No activity yet"
              }
              color={ytdNet >= 0 ? "success.main" : "error.main"}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Yearly Trend — per-month text + bars */}
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              mb: 2,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              {year} — Yearly Trend
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600 }}>
                ● Collected
              </Typography>
              <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
                ● Expenses
              </Typography>
            </Box>
          </Box>

          {activeMonths.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
              No financial activity recorded for {year} yet.
            </Typography>
          ) : (
            <>
              {data.yearlyData.map((m) => {
                const hasData = m.collected > 0 || m.expenses > 0;
                return (
                  <Box
                    key={m.month}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "32px 1fr auto",
                      alignItems: "center",
                      columnGap: 1.5,
                      mb: 1,
                      opacity: hasData ? 1 : 0.4,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {m.label}
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <MiniBar
                        pct={yearMax > 0 ? (m.collected / yearMax) * 100 : 0}
                        color="success.main"
                      />
                      <MiniBar
                        pct={yearMax > 0 ? (m.expenses / yearMax) * 100 : 0}
                        color="error.main"
                      />
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 600,
                        textAlign: "right",
                        color: m.netProfit >= 0 ? "success.main" : "error.main",
                      }}
                    >
                      {fmt(m.netProfit)}
                    </Typography>
                  </Box>
                );
              })}

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  mt: 1.5,
                  pt: 1.5,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Year to date
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  <Box component="span" sx={{ color: "success.main" }}>
                    {fmt(yearCollected)}
                  </Box>
                  {" collected · "}
                  <Box component="span" sx={{ color: "error.main" }}>
                    {fmt(yearExpenses)}
                  </Box>
                  {" spent"}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
