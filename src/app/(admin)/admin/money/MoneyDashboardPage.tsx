"use client";

import dynamic from "next/dynamic";
import { Box, Card, CircularProgress, Alert } from "@mui/material";
import { useMoneyDashboard } from "./hooks/useMoneyDashboard";
import { useMoneyInsights } from "./hooks/useMoneyInsights";
import MoneyDashboardHeader from "./components/MoneyDashboardHeader";
import MoneyHeadlineStatsRow from "./components/MoneyHeadlineStatsRow";
import MoneySpendInsightsRow from "./components/MoneySpendInsightsRow";
import MoneyPositionStatsRow from "./components/MoneyPositionStatsRow";
import AccountBalancesCard from "./components/AccountBalancesCard";
import VentureIncomeCard from "./components/VentureIncomeCard";

const MoneyCharts = dynamic(() => import("./MoneyCharts"), {
  ssr: false,
  loading: () => (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3, mb: 3 }}>
      <Card sx={{ bgcolor: "background.paper", height: 320 }} />
      <Card sx={{ bgcolor: "background.paper", height: 320 }} />
    </Box>
  ),
});

export default function MoneyDashboardPage() {
  const { data, loading, error, range, setRange } = useMoneyDashboard();
  const insights = useMoneyInsights(data);

  const header = <MoneyDashboardHeader range={range} onRangeChange={setRange} />;

  return (
    <Box>
      {header}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading || !data || !insights ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <MoneyHeadlineStatsRow insights={insights} />
          <MoneySpendInsightsRow insights={insights} />
          <MoneyPositionStatsRow data={data} />

          <MoneyCharts trend={insights.trend} expenseByCategory={data.expenseByCategory} />

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 3 }}>
            <AccountBalancesCard accounts={data.accounts} />
            <VentureIncomeCard insights={insights} />
          </Box>
        </>
      )}
    </Box>
  );
}
