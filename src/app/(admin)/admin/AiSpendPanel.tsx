"use client";

import { useEffect, useState } from "react";
import { Box, Card, CardContent, Typography, Avatar, Chip } from "@mui/material";
import { Wallet, TrendingUp, PiggyBank, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { aiApi } from "@/lib/api/ai";
import type { UsageSummary } from "@/services/ai/types";

const usd = (n: number) => `$${n.toFixed(n > 0 && n < 1 ? 4 : 2)}`;
const monthLabel = (period: string) => {
  const [y, m] = period.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "short" });
};

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

  const cards = [
    {
      label: "Spent this month",
      value: usd(usage.monthToDate),
      icon: Wallet,
      color: "#7367f0",
    },
    {
      label: "Monthly budget",
      value: usage.monthlyLimitUsd === null ? "No limit" : usd(usage.monthlyLimitUsd),
      icon: PiggyBank,
      color: "#00cfe8",
    },
    {
      label: "Remaining",
      value: usage.remaining === null ? "—" : usd(usage.remaining),
      icon: TrendingUp,
      color: usage.overBudget ? "#ea5455" : "#28c76f",
    },
    {
      label: "Projected month-end",
      value: usd(usage.projectedMonthEnd),
      icon: Activity,
      color: "#ff9f43",
    },
  ];

  const chartData = usage.monthly.map((m) => ({ name: monthLabel(m.period), cost: m.costUsd }));
  const hasSpend = usage.allTime > 0;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="overline" color="text.secondary">
          AI Spend (USD)
        </Typography>
        {usage.overBudget && (
          <Chip
            label="Budget exceeded — chat blocked"
            size="small"
            color="error"
            sx={{ height: 22 }}
          />
        )}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2.5,
        }}
      >
        {cards.map(({ label, value, icon: Icon, color }) => (
          <Card
            key={label}
            sx={{
              bgcolor: `${color}14`,
              border: "1px solid",
              borderColor: `${color}40`,
              boxShadow: "none",
            }}
          >
            <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
              <Avatar sx={{ width: 38, height: 38, borderRadius: "10px", bgcolor: color, mb: 1.5 }}>
                <Icon size={18} color="#fff" />
              </Avatar>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.25 }}>
                {value}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Card>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Monthly AI cost — last 12 months
          </Typography>
          {hasSpend ? (
            <ResponsiveContainer width="99%" height={220} debounce={50}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#8692a8" }} />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8692a8" }}
                  tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                  width={56}
                />
                <Tooltip
                  formatter={(v) => [usd(Number(v ?? 0)), "Cost"]}
                  contentStyle={{ backgroundColor: "#2f3349", border: "none", borderRadius: 8 }}
                  labelStyle={{ color: "#cfd3ec" }}
                />
                <Bar
                  dataKey="cost"
                  fill="#7367f0"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Typography variant="body2" color="text.disabled" sx={{ py: 4, textAlign: "center" }}>
              No AI usage recorded yet.
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
