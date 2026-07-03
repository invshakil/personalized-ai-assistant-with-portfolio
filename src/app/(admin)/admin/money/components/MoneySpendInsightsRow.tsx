import { Box } from "@mui/material";
import { fmt, fmtPct } from "../format";
import type { useMoneyInsights } from "../hooks/useMoneyInsights";
import StatCard from "./StatCard";

interface MoneySpendInsightsRowProps {
  insights: NonNullable<ReturnType<typeof useMoneyInsights>>;
}

export default function MoneySpendInsightsRow({ insights }: MoneySpendInsightsRowProps) {
  const { topCat, expenseTotal, avgMonthlySpend, monthsCount, top3Share, cats } = insights;

  return (
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
      <StatCard label="Categories used" value={String(cats.length)} sub="expense categories" />
    </Box>
  );
}
