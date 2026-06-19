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
  Cell,
} from "recharts";
import type { SavingsPoint, ExpenseCategorySlice } from "@/types";
import { fmt, fmtShort } from "./format";

const CAT_COLORS = ["#7367f0", "#00cfe8", "#28c76f", "#ff9f43", "#ea5455", "#9c8cf0", "#56cad6"];

const tooltipStyle = {
  contentStyle: { backgroundColor: "#2f3349", border: "none", borderRadius: 8 },
  labelStyle: { color: "#cfd3ec" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(period: string): string {
  const [y, m] = period.split("-");
  return `${MONTHS[Number(m) - 1]}'${y.slice(2)}`;
}

export default function MoneyCharts({
  savings,
  expenseByCategory,
}: {
  savings: SavingsPoint[];
  expenseByCategory: ExpenseCategorySlice[];
}) {
  const trend = savings.map((s) => ({
    label: monthLabel(s.period),
    income: s.income,
    expense: s.expense,
    savings: s.savings,
  }));
  const cats = expenseByCategory.slice(0, 8).map((c) => ({ name: c.name, value: c.total }));

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
            Income · Expense · Savings
          </Typography>
          <ResponsiveContainer width="99%" height={260} debounce={50}>
            <LineChart data={trend} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
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
              <Tooltip formatter={(v, n) => [fmt(Number(v ?? 0)), n]} {...tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#28c76f"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Expense"
                stroke="#ea5455"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="savings"
                name="Savings"
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
            Expenses by Category
          </Typography>
          <ResponsiveContainer width="99%" height={260} debounce={50}>
            <BarChart data={cats} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#8692a8" }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#8692a8" }}
                tickFormatter={(v) => fmtShort(v)}
                width={56}
              />
              <Tooltip formatter={(v) => [fmt(Number(v ?? 0)), "Spent"]} {...tooltipStyle} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                {cats.map((_, i) => (
                  <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
