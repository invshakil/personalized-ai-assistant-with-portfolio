"use client";

import dynamic from "next/dynamic";
import { Box, Card, CircularProgress, Alert } from "@mui/material";
import { useFinanceDashboard } from "./hooks/useFinanceDashboard";
import { useFinanceInsights } from "./hooks/useFinanceInsights";
import FinanceDashboardHeader from "./components/FinanceDashboardHeader";
import FinanceTotalsRow from "./components/FinanceTotalsRow";
import FinanceInsightsRow from "./components/FinanceInsightsRow";
import FiscalYearPnlCard from "./components/FiscalYearPnlCard";
import EmployeePaymentsCard from "./components/EmployeePaymentsCard";
import RemittanceSplitCard from "./components/RemittanceSplitCard";

const FinanceCharts = dynamic(() => import("./FinanceCharts"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", height: 300 }} />
      <Card sx={{ bgcolor: "background.paper", height: 300 }} />
    </Box>
  ),
});

export default function FinanceDashboardPage() {
  const { data, loading, error, range, setRange, reportPdfHref } = useFinanceDashboard();
  const insights = useFinanceInsights(data);

  const header = (
    <FinanceDashboardHeader range={range} onRangeChange={setRange} reportPdfHref={reportPdfHref} />
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

  if (error || !data || !insights) {
    return (
      <Box>
        {header}
        <Alert severity="error">{error ?? "No data available"}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      {header}

      <FinanceTotalsRow totals={data.totals} />
      <FinanceInsightsRow insights={insights} />

      <FinanceCharts data={data} />

      <FiscalYearPnlCard pnl={data.pnl} />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "3fr 2fr" }, gap: 3 }}>
        <EmployeePaymentsCard fiscalYears={data.fiscalYears} byEmployee={data.byEmployee} />
        <RemittanceSplitCard remittance={data.remittance} />
      </Box>
    </Box>
  );
}
