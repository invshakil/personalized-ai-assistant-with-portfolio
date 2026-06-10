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
  Legend,
  ResponsiveContainer,
} from "recharts";
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
  return `৳${n.toLocaleString()}`;
}

interface Props {
  data: PropertyDashboardStats;
  month: number;
  year: number;
}

export default function PropertyCharts({ data, month, year }: Props) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            {MONTHS[month - 1]} {year} — Financial Overview
          </Typography>
          <ResponsiveContainer width="99%" height={220} debounce={50}>
            <BarChart
              data={[
                { name: "Expected", value: data.totalExpected },
                { name: "Collected", value: data.totalCollected },
                { name: "Expenses", value: data.totalExpenses },
                { name: "Net Profit", value: Math.max(0, data.netProfit) },
              ]}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8692a8" }} />
              <YAxis
                tick={{ fontSize: 11, fill: "#8692a8" }}
                tickFormatter={(v) => `৳${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v ?? 0)), ""]}
                contentStyle={{ backgroundColor: "#2f3349", border: "none", borderRadius: 8 }}
                labelStyle={{ color: "#cfd3ec" }}
              />
              <Bar dataKey="value" fill="#7367f0" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            {year} — Yearly Trend
          </Typography>
          <ResponsiveContainer width="99%" height={220} debounce={50}>
            <LineChart data={data.yearlyData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8692a8" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "#8692a8" }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(v) => [fmt(Number(v ?? 0)), ""]}
                contentStyle={{ backgroundColor: "#2f3349", border: "none", borderRadius: 8 }}
                labelStyle={{ color: "#cfd3ec" }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="collected"
                stroke="#0D7377"
                strokeWidth={2}
                dot={false}
                name="Collected"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#C0392B"
                strokeWidth={2}
                dot={false}
                name="Expenses"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="netProfit"
                stroke="#28c76f"
                strokeWidth={2}
                dot={false}
                name="Net Profit"
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
