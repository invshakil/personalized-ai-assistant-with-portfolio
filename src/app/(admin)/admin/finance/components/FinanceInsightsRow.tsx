import { Box } from "@mui/material";
import { fmt, fmtPct, fmtPeriod } from "../format";
import type { useFinanceInsights } from "../hooks/useFinanceInsights";
import StatCard from "./StatCard";

interface FinanceInsightsRowProps {
  insights: NonNullable<ReturnType<typeof useFinanceInsights>>;
}

export default function FinanceInsightsRow({ insights }: FinanceInsightsRowProps) {
  const {
    monthsTracked,
    avgMonthly,
    bestMonth,
    latest,
    prev,
    mom,
    clients,
    topClient,
    clientConcentration,
  } = insights;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
      <StatCard
        label="Avg Monthly Income"
        value={fmt(avgMonthly)}
        sub={`across ${monthsTracked} month${monthsTracked === 1 ? "" : "s"}`}
      />
      <StatCard
        label="Best Month"
        value={bestMonth ? fmt(bestMonth.amount) : "—"}
        color="info.main"
        sub={bestMonth ? fmtPeriod(bestMonth.period, { long: true }) : "no income yet"}
      />
      <StatCard
        label="Month-on-Month"
        value={mom == null ? "—" : `${mom >= 0 ? "+" : ""}${fmtPct(mom)}`}
        color={mom == null ? "text.secondary" : mom >= 0 ? "success.main" : "error.main"}
        sub={
          latest && prev
            ? `${fmtPeriod(prev.period)} → ${fmtPeriod(latest.period)}`
            : "need 2+ months"
        }
      />
      <StatCard
        label="Top Client"
        value={topClient ? topClient.name : "—"}
        color="primary.main"
        sub={
          topClient
            ? `${fmt(topClient.total)} · ${fmtPct(clientConcentration)} of income`
            : "no clients yet"
        }
      />
      <StatCard
        label="Active Clients"
        value={String(clients.length)}
        sub="income sources in range"
      />
    </Box>
  );
}
