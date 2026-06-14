"use client";

import { Card, CardContent, Typography, Box } from "@mui/material";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { FinanceDashboardData } from "./types";
import { fmt, fmtShort } from "./format";

const SOURCE_COLORS = ["#7367f0", "#00cfe8", "#28c76f", "#ff9f43", "#ea5455"];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#2f3349", border: "none", borderRadius: 8 },
  labelStyle: { color: "#cfd3ec" },
};

function MonthLabel(period: string) {
  // "2025-08" → "Aug'25"
  const [y, m] = period.split("-");
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][Number(m) - 1];
  return `${month}'${y.slice(2)}`;
}

export default function FinanceCharts({ data }: { data: FinanceDashboardData }) {
  const monthly = data.monthlyIncome.map((m) => ({
    label: MonthLabel(m.period),
    amount: m.amount,
  }));
  const sources = data.bySource.map((s) => ({ name: s.name, value: s.total }));

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Monthly Income Trend
          </Typography>
          <ResponsiveContainer width="99%" height={240} debounce={50}>
            <LineChart data={monthly} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "#8692a8" }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8692a8" }}
                tickFormatter={(v) => fmtShort(v)}
                width={56}
              />
              <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), "Income"]} {...tooltipStyle} />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#7367f0"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Income by Client
          </Typography>
          <ResponsiveContainer width="99%" height={240} debounce={50}>
            <BarChart data={sources} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8692a8" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "#8692a8" }}
                tickFormatter={(v) => fmtShort(v)}
                width={56}
              />
              <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), "Income"]} {...tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {sources.map((_, i) => (
                  <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
