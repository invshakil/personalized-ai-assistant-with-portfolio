"use client";

import { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, Chip } from "@mui/material";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { aiApi } from "@/lib/api/ai";
import type { UsageSummary } from "@/services/ai/types";

const usd = (n: number) => `$${n.toFixed(n > 0 && n < 1 ? 4 : 2)}`;
const dayLabel = (period: string) => {
  const [, m, d] = period.split("-").map(Number);
  return `${m}/${d}`;
};

/** Half-width card: daily AI cost over the last 30 days + compact USD KPIs. */
export default function AiSpendPanel() {
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    aiApi
      .getUsage()
      .then(setUsage)
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded || !usage) return null;

  const chartData = usage.daily.map((d) => ({ name: dayLabel(d.period), cost: d.costUsd }));
  const hasSpend = usage.daily.some((d) => d.costUsd > 0);

  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            AI usage · last 30 days
          </Typography>
          {usage.overBudget && (
            <Chip
              label="Over budget"
              size="small"
              color="error"
              sx={{ ml: "auto", height: 22, fontSize: "0.68rem" }}
            />
          )}
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              MTD
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {usd(usage.monthToDate)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Budget
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {usage.monthlyLimitUsd === null ? "—" : usd(usage.monthlyLimitUsd)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Remaining
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: usage.overBudget ? "error.main" : "success.main",
              }}
            >
              {usage.remaining === null ? "—" : usd(usage.remaining)}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Projected
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {usd(usage.projectedMonthEnd)}
            </Typography>
          </Box>
        </Box>

        {hasSpend ? (
          <ResponsiveContainer width="99%" height={200} debounce={50}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#8692a8" }} interval={3} />
              <YAxis
                tick={{ fontSize: 10, fill: "#8692a8" }}
                tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                width={50}
              />
              <Tooltip
                formatter={(v) => [usd(Number(v ?? 0)), "Cost"]}
                contentStyle={{ backgroundColor: "#2f3349", border: "none", borderRadius: 8 }}
                labelStyle={{ color: "#cfd3ec" }}
              />
              <Bar dataKey="cost" fill="#7367f0" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Typography variant="body2" color="text.disabled" sx={{ py: 4, textAlign: "center" }}>
            No AI usage in the last 30 days.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
