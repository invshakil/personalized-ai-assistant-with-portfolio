"use client";

import { useState, useEffect, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Tooltip as MuiTooltip,
} from "@mui/material";
import { Info } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { moneyApi } from "@/lib/api/money";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { MoneyDashboardData } from "@/types";
import {
  fmt,
  fmtPct,
  fmtCurrency,
  fmtDate,
  ACCOUNT_TYPE_LABEL,
  MONEY_RANGE_LABELS,
  MONEY_RANGE_PERIOD,
  type MoneyRange,
} from "./format";

const RANGE_ORDER: MoneyRange[] = ["M1", "M3", "M6", "Y1", "ALL"];

const MoneyCharts = dynamic(() => import("./MoneyCharts"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", height: 320 }} />
      <Card sx={{ bgcolor: "background.paper", height: 320 }} />
    </Box>
  ),
});

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: ReactNode;
}) {
  return (
    <Card sx={{ flex: "1 1 160px", minWidth: 160, bgcolor: "background.paper" }}>
      <CardContent sx={{ py: "14px !important", px: 2 }}>
        <Typography variant="h5" noWrap sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
          {label}
        </Typography>
        {sub != null && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ display: "block", mt: 0.25, opacity: 0.85 }}
          >
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function MoneyDashboardPage() {
  const [data, setData] = useState<MoneyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<MoneyRange>("M1");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setData((await moneyApi.dashboard({ period: MONEY_RANGE_PERIOD[range] })) ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  return (
    <Box>
      <PageHeader title="Money Manager" subtitle="Income, spending, savings & balances" />

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Period</InputLabel>
          <Select
            label="Period"
            value={range}
            onChange={(e) => setRange(e.target.value as MoneyRange)}
          >
            {RANGE_ORDER.map((r) => (
              <MenuItem key={r} value={r}>
                {MONEY_RANGE_LABELS[r]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading || !data ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        (() => {
          // ── Blend venture take-home into income (user-chosen behaviour) ──────
          // Property & Financial Tracker net is real earned income tracked in
          // those modules; the personal ledger has no income credits yet, so we
          // surface it here rather than show a misleading ৳0. The service's
          // ledger-truth totals are left untouched — blending lives in this view.
          const recordedIncome = data.totals.income;
          const ventureProperty = data.venture.reduce((s, v) => s + v.propertyNet, 0);
          const ventureBusiness = data.venture.reduce((s, v) => s + v.businessNet, 0);
          const ventureTotal = ventureProperty + ventureBusiness;
          const income = recordedIncome + ventureTotal;
          const expense = data.totals.expense;
          const savings = income - expense;
          const savingsRate = income ? savings / income : 0;

          // Merge ledger months + venture months into one blended trend series.
          const byPeriod = new Map<string, { income: number; expense: number; venture: number }>();
          const ensure = (p: string) =>
            byPeriod.get(p) ?? byPeriod.set(p, { income: 0, expense: 0, venture: 0 }).get(p)!;
          for (const s of data.savings) {
            const r = ensure(s.period);
            r.income += s.income;
            r.expense += s.expense;
          }
          for (const v of data.venture) ensure(v.period).venture += v.propertyNet + v.businessNet;
          const trend = Array.from(byPeriod.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([period, r]) => ({
              period,
              income: r.income + r.venture,
              expense: r.expense,
              savings: r.income + r.venture - r.expense,
            }));

          // Spend insights.
          const cats = data.expenseByCategory;
          const expenseTotal = cats.reduce((s, c) => s + c.total, 0);
          const topCat = cats[0] ?? null;
          const top3 = cats.slice(0, 3).reduce((s, c) => s + c.total, 0);
          const top3Share = expenseTotal ? top3 / expenseTotal : 0;
          const monthsCount =
            new Set([...data.savings.map((s) => s.period), ...data.venture.map((v) => v.period)])
              .size || 1;
          const avgMonthlySpend = expenseTotal / monthsCount;

          const venturePct = ventureTotal ? Math.round((ventureProperty / ventureTotal) * 100) : 0;

          return (
            <>
              {/* Headline stats — income blends recorded ledger + venture take-home */}
              <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <StatCard
                  label="Income"
                  value={fmt(income)}
                  color="success.main"
                  sub={`recorded ${fmt(recordedIncome)} · venture ${fmt(ventureTotal)}`}
                />
                <StatCard label="Expenses" value={fmt(expense)} color="error.main" />
                <StatCard
                  label="Savings"
                  value={fmt(savings)}
                  color={savings < 0 ? "error.main" : "primary.main"}
                />
                <StatCard label="Savings rate" value={fmtPct(savingsRate)} />
              </Box>

              {/* Spend insights */}
              <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <StatCard
                  label="Top category"
                  value={topCat ? topCat.name : "—"}
                  color="error.main"
                  sub={
                    topCat
                      ? `${fmt(topCat.total)} · ${fmtPct(expenseTotal ? topCat.total / expenseTotal : 0)} of spend`
                      : "no spending"
                  }
                />
                <StatCard
                  label="Avg monthly spend"
                  value={fmt(avgMonthlySpend)}
                  sub={`over ${monthsCount} month${monthsCount === 1 ? "" : "s"}`}
                />
                <StatCard
                  label="Top-3 concentration"
                  value={fmtPct(top3Share)}
                  color="warning.main"
                  sub="of spend in top 3 categories"
                />
                <StatCard
                  label="Categories used"
                  value={String(cats.length)}
                  sub="expense categories"
                />
              </Box>

              {/* Position stats */}
              <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                <StatCard
                  label="Cash position"
                  value={fmt(data.cashPosition)}
                  color="success.main"
                  sub={(() => {
                    const foreign = data.balancesByCurrency.filter((b) => b.currency !== "BDT");
                    if (foreign.length === 0) return undefined;
                    const parts = foreign.map((b) => fmtCurrency(b.native, b.currency)).join(", ");
                    return `incl. ${parts}${data.fxAsOf ? ` · @ ${fmtDate(data.fxAsOf)}` : ""}`;
                  })()}
                />
                <StatCard label="Credit-card debt" value={fmt(data.cardDebt)} color="error.main" />
                <StatCard
                  label="I still owe"
                  value={fmt(data.peopleOwed.owedByMe)}
                  color="warning.main"
                />
                <StatCard
                  label="Owed to me"
                  value={fmt(data.peopleOwed.owedToMe)}
                  color="info.main"
                />
              </Box>

              <MoneyCharts trend={trend} expenseByCategory={data.expenseByCategory} />

              {/* Account balances + Venture income breakdown */}
              <Box
                sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}
              >
                <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, px: 2, pt: 2 }}>
                    Account balances
                  </Typography>
                  <Table size="small" sx={mobileCardTableSx}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Account</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          Balance
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.accounts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ textAlign: "center", py: 3 }}>
                            <Typography color="text.secondary" variant="body2">
                              No accounts yet
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        data.accounts.map((a) => (
                          <TableRow key={a.id} hover>
                            <TableCell data-label="Account" sx={{ fontWeight: 600 }}>
                              {a.name}
                            </TableCell>
                            <TableCell data-label="Type">
                              {ACCOUNT_TYPE_LABEL[a.type]}
                              {a.currency !== "BDT" ? ` · ${a.currency}` : ""}
                            </TableCell>
                            <TableCell
                              align="right"
                              data-label="Balance"
                              sx={{
                                fontWeight: 700,
                                color: a.balance < 0 ? "error.main" : "text.primary",
                              }}
                            >
                              {fmtCurrency(a.balance, a.currency)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>

                <Card sx={{ bgcolor: "background.paper" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        Venture income
                      </Typography>
                      <MuiTooltip title="Take-home from Property & Financial Tracker for this period. Now blended into the Income figure above. Record it as a ledger credit when the money lands in an account to keep balances accurate.">
                        <Info size={14} />
                      </MuiTooltip>
                    </Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: "success.main", mb: 2 }}>
                      {fmt(ventureTotal)}
                    </Typography>

                    {ventureTotal === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No venture activity in this period.
                      </Typography>
                    ) : (
                      <>
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                            gap: 1,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Property net
                          </Typography>
                          <Typography variant="body2">{fmt(ventureProperty)}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={venturePct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            mb: 2,
                            bgcolor: "action.hover",
                            "& .MuiLinearProgress-bar": { bgcolor: "info.main", borderRadius: 3 },
                          }}
                        />
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            mb: 0.5,
                            gap: 1,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Business net
                          </Typography>
                          <Typography variant="body2">{fmt(ventureBusiness)}</Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={100 - venturePct}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                            bgcolor: "action.hover",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: "primary.main",
                              borderRadius: 3,
                            },
                          }}
                        />
                      </>
                    )}

                    {recordedIncome > 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 2 }}
                      >
                        {fmt(recordedIncome)} already recorded as ledger income this period.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Box>
            </>
          );
        })()
      )}
    </Box>
  );
}
