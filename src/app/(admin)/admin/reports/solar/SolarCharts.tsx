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
import type { SolarMonthRow } from "@/types";

const tooltipStyle = {
  contentStyle: { backgroundColor: "#2f3349", border: "none", borderRadius: 8 },
  labelStyle: { color: "#cfd3ec" },
};

const fmtShort = (v: number) => {
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
};
const fmtKwh = (v: number) => `${fmtShort(Number(v ?? 0))} kWh`;

export default function SolarCharts({
  months,
  currency,
}: {
  months: SolarMonthRow[];
  currency: string;
}) {
  const money = (v: number) =>
    `${currency === "BDT" ? "৳" : ""}${Math.round(Number(v ?? 0)).toLocaleString("en-US")}`;

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      {/* Generation */}
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Monthly Solar Generation
          </Typography>
          <ResponsiveContainer width="99%" height={240} debounce={50}>
            <BarChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8692a8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#8692a8" }} tickFormatter={fmtShort} width={44} />
              <Tooltip formatter={(v) => [fmtKwh(Number(v)), "Generation"]} {...tooltipStyle} />
              <Bar
                dataKey="generationKwh"
                fill="#ff9f43"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost: would-have vs actual */}
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Bill: Without Solar vs Actual
          </Typography>
          <ResponsiveContainer width="99%" height={240} debounce={50}>
            <BarChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8692a8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#8692a8" }} tickFormatter={fmtShort} width={48} />
              <Tooltip formatter={(v) => money(Number(v))} {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                name="Without solar"
                dataKey="wouldHaveCost"
                fill="#ea5455"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
              <Bar
                name="Actual spent"
                dataKey="actualCost"
                fill="#28c76f"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Consumption source split */}
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Consumption by Source
          </Typography>
          <ResponsiveContainer width="99%" height={240} debounce={50}>
            <BarChart data={months} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8692a8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#8692a8" }} tickFormatter={fmtShort} width={44} />
              <Tooltip formatter={(v) => fmtKwh(Number(v))} {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                name="Solar (direct)"
                dataKey="fromSolarDirectKwh"
                stackId="c"
                fill="#ff9f43"
                isAnimationActive={false}
              />
              <Bar
                name="Battery"
                dataKey="fromBatteryKwh"
                stackId="c"
                fill="#7367f0"
                isAnimationActive={false}
              />
              <Bar
                name="Grid"
                dataKey="fromGridKwh"
                stackId="c"
                fill="#00cfe8"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Self-sufficiency */}
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Self-Sufficiency (%)
          </Typography>
          <ResponsiveContainer width="99%" height={240} debounce={50}>
            <LineChart data={months} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8692a8" }} />
              <YAxis
                tick={{ fontSize: 10, fill: "#8692a8" }}
                width={36}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(1)}%`, "Self-sufficient"]}
                {...tooltipStyle}
              />
              <Line
                type="monotone"
                dataKey="selfSufficiencyPct"
                stroke="#28c76f"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
