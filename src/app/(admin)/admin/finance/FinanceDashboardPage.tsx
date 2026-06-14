"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
} from "@mui/material";
import { Download } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import { financeApi } from "@/lib/api/finance";
import { mobileCardTableSx } from "@/lib/mobileTableSx";
import type { FinanceDashboardData } from "./types";
import { fmt, fmtPct, rangeBounds, RANGE_LABELS, type RangePreset } from "./format";

const RANGE_ORDER: RangePreset[] = ["M1", "M3", "M6", "FY", "Y1", "Y2", "ALL"];

const FinanceCharts = dynamic(() => import("./FinanceCharts"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", height: 300 }} />
      <Card sx={{ bgcolor: "background.paper", height: 300 }} />
    </Box>
  ),
});

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card sx={{ flex: "1 1 150px", minWidth: 150, bgcolor: "background.paper" }}>
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

export default function FinanceDashboardPage() {
  const [data, setData] = useState<FinanceDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangePreset>("FY");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { from, to } = rangeBounds(range);
        const data = await financeApi.dashboard({ from, to });
        setData(data ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [range]);

  const { from: rangeFrom, to: rangeTo } = rangeBounds(range);
  const reportPdfHref = `/api/admin/finance/report/pdf?${new URLSearchParams({
    ...(rangeFrom && { from: rangeFrom }),
    ...(rangeTo && { to: rangeTo }),
    label: RANGE_LABELS[range],
  }).toString()}`;

  const rangeSelector = (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <InputLabel>Date range</InputLabel>
      <Select
        label="Date range"
        value={range}
        onChange={(e) => setRange(e.target.value as RangePreset)}
      >
        {RANGE_ORDER.map((r) => (
          <MenuItem key={r} value={r}>
            {RANGE_LABELS[r]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const header = (
    <>
      <PageHeader title="Financial Tracker" subtitle="Business income, costs & profit by date range" />
      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center", flexWrap: "wrap" }}>
        {rangeSelector}
        <Box sx={{ ml: "auto" }}>
          <a href={reportPdfHref} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
            <Button variant="outlined" startIcon={<Download size={16} />}>
              Download report PDF
            </Button>
          </a>
        </Box>
      </Box>
    </>
  );

  if (loading) {
    return (
      <Box>
        {header}
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error || !data) {
    return (
      <Box>
        {header}
        <Alert severity="error">{error ?? "No data available"}</Alert>
      </Box>
    );
  }

  const { totals, remittance } = data;
  const remTotal = remittance.rem + remittance.nonRem;
  const remPct = remTotal ? (remittance.rem / remTotal) * 100 : 0;

  return (
    <Box>
      {header}

      {/* Totals for the selected range */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <StatCard label="Total Income" value={fmt(totals.income)} color="info.main" />
        <StatCard label="Employee Costs" value={fmt(totals.empCosts)} color="warning.main" />
        <StatCard label="Tools / Subscriptions" value={fmt(totals.toolSubs)} color="warning.main" />
        <StatCard label="Net Profit" value={fmt(totals.netProfit)} color="success.main" />
        <StatCard label="Profit Margin" value={fmtPct(totals.margin)} color="primary.main" />
      </Box>

      <FinanceCharts data={data} />

      {/* P&L by fiscal year */}
      <Card sx={{ bgcolor: "background.paper", mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
            Business Performance by Fiscal Year
          </Typography>
          <TableContainer>
            <Table size="small" sx={mobileCardTableSx}>
              <TableHead>
                <TableRow>
                  <TableCell>Fiscal Year</TableCell>
                  <TableCell align="right">Income</TableCell>
                  <TableCell align="right">Emp Costs</TableCell>
                  <TableCell align="right">Tools/Subs</TableCell>
                  <TableCell align="right">Net Profit</TableCell>
                  <TableCell align="right">Margin</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.pnl.map((r) => (
                  <TableRow key={r.fiscalYear} hover>
                    <TableCell data-label="Fiscal Year" sx={{ fontWeight: 600 }}>{r.fiscalYear}</TableCell>
                    <TableCell align="right" data-label="Income">{fmt(r.income)}</TableCell>
                    <TableCell align="right" data-label="Emp Costs" sx={{ color: "warning.main" }}>
                      {fmt(r.empCosts)}
                    </TableCell>
                    <TableCell align="right" data-label="Tools/Subs" sx={{ color: "warning.main" }}>
                      {fmt(r.toolSubs)}
                    </TableCell>
                    <TableCell align="right" data-label="Net Profit" sx={{ color: "success.main", fontWeight: 600 }}>
                      {fmt(r.netProfit)}
                    </TableCell>
                    <TableCell align="right" data-label="Margin">
                      <Chip
                        size="small"
                        label={fmtPct(r.margin)}
                        color={r.margin >= 0.5 ? "success" : r.margin >= 0 ? "warning" : "error"}
                        variant="outlined"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" }, gap: 3 }}>
        {/* Per-employee × fiscal year */}
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
              Salaries Paid by Employee
            </Typography>
            <TableContainer>
              <Table size="small" sx={mobileCardTableSx}>
                <TableHead>
                  <TableRow>
                    <TableCell>Employee</TableCell>
                    {data.fiscalYears.map((fy) => (
                      <TableCell key={fy} align="right">
                        {fy}
                      </TableCell>
                    ))}
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.byEmployee.map((e) => (
                    <TableRow key={e.employeeId} hover>
                      <TableCell data-label="Employee" sx={{ fontWeight: 600 }}>{e.name}</TableCell>
                      {data.fiscalYears.map((fy) => (
                        <TableCell key={fy} align="right" data-label={fy}>
                          {e.byFiscalYear[fy] ? fmt(e.byFiscalYear[fy]) : "—"}
                        </TableCell>
                      ))}
                      <TableCell align="right" data-label="Total" sx={{ fontWeight: 600 }}>
                        {fmt(e.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Remittance split */}
        <Card sx={{ bgcolor: "background.paper" }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
              Remittance vs Non-Remittance
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
                Remittance
              </Typography>
              <Typography variant="body2">{fmt(remittance.rem)}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={remPct}
              sx={{ height: 8, borderRadius: 4, mb: 2, "& .MuiLinearProgress-bar": { bgcolor: "success.main" } }}
            />
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography variant="body2" sx={{ color: "info.main", fontWeight: 600 }}>
                Non-Remittance
              </Typography>
              <Typography variant="body2">{fmt(remittance.nonRem)}</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={100 - remPct}
              sx={{ height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { bgcolor: "info.main" } }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              {fmtPct(remPct / 100)} of total income received as foreign remittance.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
