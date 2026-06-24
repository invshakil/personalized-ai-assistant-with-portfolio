"use client";

import { Card, CardContent, Typography, Box, LinearProgress } from "@mui/material";
import { fmt, fmtPct } from "./format";

const CAT_COLORS = ["#7367f0", "#00cfe8", "#28c76f", "#ff9f43", "#ea5455", "#9c8cf0", "#56cad6"];

export interface TrendPoint {
  period: string; // YYYY-MM
  income: number; // blended (ledger credits + venture net)
  expense: number;
  savings: number;
}

export interface CategorySlice {
  categoryId: string;
  name: string;
  total: number;
}

function FlowRow({
  label,
  amount,
  pct,
  color,
  caption,
}: {
  label: string;
  amount: number;
  pct: number; // 0–100 bar width
  color: string; // MUI palette key, e.g. "success.main"
  caption?: string;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}
      >
        <Typography
          variant="body2"
          sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 1 }}
        >
          <Box
            component="span"
            sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, flexShrink: 0 }}
          />
          {label}
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 700, color, whiteSpace: "nowrap" }}>
          {fmt(amount)}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, pct))}
        sx={{
          height: 8,
          borderRadius: 4,
          my: 0.5,
          bgcolor: "action.hover",
          "& .MuiLinearProgress-bar": { bgcolor: color, borderRadius: 4 },
        }}
      />
      {caption && (
        <Typography variant="caption" color="text.secondary">
          {caption}
        </Typography>
      )}
    </Box>
  );
}

export default function MoneyCharts({
  trend,
  expenseByCategory,
}: {
  trend: TrendPoint[];
  expenseByCategory: CategorySlice[];
}) {
  // Aggregate the period into a single money-flow summary — far more readable
  // than a 1-point chart for "This month" (the default range).
  const income = trend.reduce((s, t) => s + t.income, 0);
  const expense = trend.reduce((s, t) => s + t.expense, 0);
  const savings = income - expense;
  const base = Math.max(income, expense, 1);
  const expenseRate = income ? expense / income : 0;
  const savingsRate = income ? savings / income : 0;
  const months = trend.length;

  const cats = expenseByCategory;
  const catTotal = cats.reduce((s, c) => s + c.total, 0);
  const catMax = Math.max(...cats.map((c) => c.total), 1);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
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
              Money Flow
            </Typography>
            {months > 0 && (
              <Typography variant="caption" color="text.secondary">
                {months === 1 ? "this period" : `${months} months`}
              </Typography>
            )}
          </Box>

          {income === 0 && expense === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 8, textAlign: "center" }}>
              No activity in this period
            </Typography>
          ) : (
            <>
              <FlowRow
                label="Income"
                amount={income}
                pct={(income / base) * 100}
                color="success.main"
              />
              <FlowRow
                label="Expense"
                amount={expense}
                pct={(expense / base) * 100}
                color="error.main"
                caption={
                  !income
                    ? "no income recorded"
                    : expenseRate > 1.5
                      ? `${expenseRate.toFixed(1)}× your income`
                      : `${fmtPct(expenseRate)} of income spent`
                }
              />
              <Box sx={{ height: "1px", bgcolor: "divider", mb: 2 }} />
              <FlowRow
                label="Net savings"
                amount={savings}
                pct={(Math.abs(savings) / base) * 100}
                color={savings < 0 ? "error.main" : "primary.main"}
                caption={
                  savings < 0
                    ? `overspent by ${fmt(-savings)}`
                    : income
                      ? `${fmtPct(savingsRate)} savings rate`
                      : undefined
                }
              />
            </>
          )}
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
              Expenses by Category
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {fmt(catTotal)} total
            </Typography>
          </Box>

          {cats.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 8, textAlign: "center" }}>
              No spending in this period
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 280, overflow: "auto", pr: 0.5 }}>
              {cats.map((c, i) => {
                const share = catTotal ? (c.total / catTotal) * 100 : 0;
                const color = CAT_COLORS[i % CAT_COLORS.length];
                return (
                  <Box key={c.categoryId} sx={{ mb: i === cats.length - 1 ? 0 : 1.5 }}>
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
                      <Typography variant="body2" sx={{ flexShrink: 0, whiteSpace: "nowrap" }}>
                        {fmt(c.total)}{" "}
                        <Box component="span" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>
                          {share.toFixed(0)}%
                        </Box>
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(c.total / catMax) * 100}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "action.hover",
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
