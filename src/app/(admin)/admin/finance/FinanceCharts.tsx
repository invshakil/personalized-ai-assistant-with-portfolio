"use client";

import type { ReactNode } from "react";
import { Card, CardContent, Typography, Box, LinearProgress } from "@mui/material";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from "recharts";
import type { FinanceDashboardData } from "./types";
import { fmt, fmtShort, fmtPeriod } from "./format";

const SOURCE_COLORS = ["#7367f0", "#00cfe8", "#28c76f", "#ff9f43", "#ea5455"];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#2f3349", border: "none", borderRadius: 8 },
  labelStyle: { color: "#cfd3ec" },
};

export default function FinanceCharts({ data }: { data: FinanceDashboardData }) {
  const monthly = data.monthlyIncome.map((m) => ({
    label: fmtPeriod(m.period),
    amount: m.amount,
  }));

  // At-a-glance trend stats — so the chart reads without hovering.
  const months = monthly.length;
  const avg = months ? monthly.reduce((s, m) => s + m.amount, 0) / months : 0;
  const peak = monthly.reduce(
    (best, m) => (m.amount > best.amount ? m : best),
    monthly[0] ?? { label: "—", amount: 0 }
  );
  // Point value labels only fit when the series is short; otherwise rely on
  // the axis + reference line + caption to stay readable.
  const showPointLabels = months > 0 && months <= 14;

  // Income by client — ranked descending so the list is glanceable.
  const sources = [...data.bySource].sort((a, b) => b.total - a.total);
  const sourceTotal = sources.reduce((s, c) => s + c.total, 0);
  const sourceMax = Math.max(...sources.map((s) => s.total), 1);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Monthly Income Trend
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Avg {fmtShort(avg)}/mo
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ display: "block", mb: 1.5, color: "text.secondary" }}>
            {months ? (
              <>
                Peak{" "}
                <Box component="span" sx={{ color: "primary.main", fontWeight: 600 }}>
                  {fmt(peak.amount)}
                </Box>{" "}
                in {peak.label} · {months} month{months === 1 ? "" : "s"} tracked
              </>
            ) : (
              "No income in this range"
            )}
          </Typography>
          <ResponsiveContainer width="99%" height={240} debounce={50}>
            <AreaChart data={monthly} margin={{ top: 18, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7367f0" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7367f0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#8692a8" }}
                interval={showPointLabels ? 0 : "preserveStartEnd"}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8692a8" }}
                tickFormatter={(v) => fmtShort(v)}
                width={56}
              />
              <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), "Income"]} {...tooltipStyle} />
              {months > 0 && (
                <ReferenceLine y={avg} stroke="#8692a8" strokeDasharray="4 4" strokeOpacity={0.6} />
              )}
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#7367f0"
                strokeWidth={2}
                fill="url(#incomeFill)"
                dot={showPointLabels ? { r: 2.5, fill: "#7367f0" } : false}
                isAnimationActive={false}
              >
                {showPointLabels && (
                  <LabelList
                    dataKey="amount"
                    position="top"
                    formatter={(v: ReactNode) => fmtShort(Number(v ?? 0))}
                    style={{ fontSize: 9, fill: "#cfd3ec", fontWeight: 600 }}
                  />
                )}
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              mb: 1.5,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
              Income by Client
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {sources.length} client{sources.length === 1 ? "" : "s"}
            </Typography>
          </Box>

          {sources.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
              No income in this range
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 240, overflow: "auto", pr: 0.5 }}>
              {sources.map((c, i) => {
                const share = sourceTotal ? (c.total / sourceTotal) * 100 : 0;
                const color = SOURCE_COLORS[i % SOURCE_COLORS.length];
                return (
                  <Box key={c.sourceId} sx={{ mb: i === sources.length - 1 ? 0 : 1.75 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5, gap: 1 }}>
                      <Typography
                        variant="body2"
                        noWrap
                        sx={{
                          fontWeight: 600,
                          minWidth: 0,
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Box
                          component="span"
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            bgcolor: color,
                            flexShrink: 0,
                          }}
                        />
                        {c.name}
                      </Typography>
                      <Typography variant="body2" sx={{ flexShrink: 0 }}>
                        {fmt(c.total)}{" "}
                        <Box component="span" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                          {share.toFixed(0)}%
                        </Box>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(c.total / sourceMax) * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,0.06)",
                        "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 3 },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
