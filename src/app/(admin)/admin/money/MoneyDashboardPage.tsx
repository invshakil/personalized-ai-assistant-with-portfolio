"use client";

import { useState, useEffect } from "react";
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
  fmtMonth,
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

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card sx={{ flex: "1 1 160px", minWidth: 160, bgcolor: "background.paper" }}>
      <CardContent sx={{ py: "14px !important", px: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: color ?? "text.primary" }}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function MoneyDashboardPage() {
  const [data, setData] = useState<MoneyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<MoneyRange>("M6");

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
        <>
          {/* Headline stats */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <StatCard label="Income" value={fmt(data.totals.income)} color="success.main" />
            <StatCard label="Expenses" value={fmt(data.totals.expense)} color="error.main" />
            <StatCard label="Savings" value={fmt(data.totals.savings)} color="primary.main" />
            <StatCard label="Savings rate" value={fmtPct(data.totals.savingsRate)} />
          </Box>

          {/* Position stats */}
          <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
            <StatCard label="Cash position" value={fmt(data.cashPosition)} color="success.main" />
            <StatCard label="Credit-card debt" value={fmt(data.cardDebt)} color="error.main" />
            <StatCard
              label="I still owe"
              value={fmt(data.peopleOwed.owedByMe)}
              color="warning.main"
            />
            <StatCard label="Owed to me" value={fmt(data.peopleOwed.owedToMe)} color="info.main" />
          </Box>

          <MoneyCharts savings={data.savings} expenseByCategory={data.expenseByCategory} />

          {/* Account balances + Venture context */}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
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
                        <TableCell data-label="Type">{ACCOUNT_TYPE_LABEL[a.type]}</TableCell>
                        <TableCell
                          align="right"
                          data-label="Balance"
                          sx={{
                            fontWeight: 700,
                            color: a.balance < 0 ? "error.main" : "text.primary",
                          }}
                        >
                          {fmt(a.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <TableContainer component={Card} sx={{ bgcolor: "background.paper" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 2, pt: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Venture income (context)
                </Typography>
                <MuiTooltip title="Take-home from Property & Financial Tracker, shown for reference. Record it as income when the money lands in an account — it is not counted in savings until you do.">
                  <Info size={14} />
                </MuiTooltip>
              </Box>
              <Table size="small" sx={mobileCardTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Month</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Property net
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Business net
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>
                      Recorded
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.venture.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: "center", py: 3 }}>
                        <Typography color="text.secondary" variant="body2">
                          No venture activity in this period
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.venture.map((v) => (
                      <TableRow key={v.period} hover>
                        <TableCell data-label="Month">{fmtMonth(`${v.period}-01`)}</TableCell>
                        <TableCell align="right" data-label="Property net">
                          {fmt(v.propertyNet)}
                        </TableCell>
                        <TableCell align="right" data-label="Business net">
                          {fmt(v.businessNet)}
                        </TableCell>
                        <TableCell
                          align="right"
                          data-label="Recorded"
                          sx={{ color: "success.main" }}
                        >
                          {fmt(v.recordedIncome)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </>
      )}
    </Box>
  );
}
