import { Box } from "@mui/material";
import { fmt, fmtPct } from "../format";
import type { useMoneyInsights } from "../hooks/useMoneyInsights";
import StatCard from "./StatCard";

interface MoneyHeadlineStatsRowProps {
  insights: NonNullable<ReturnType<typeof useMoneyInsights>>;
}

export default function MoneyHeadlineStatsRow({ insights }: MoneyHeadlineStatsRowProps) {
  const { income, ventureTotal, expense, savings, savingsRate } = insights;

  return (
    <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
      <StatCard
        label="Income"
        value={fmt(income)}
        color="success.main"
        sub={
          ventureTotal > 0
            ? `recorded in ledger · ${fmt(ventureTotal)} venture (context, see below)`
            : "recorded in ledger"
        }
      />
      <StatCard label="Expenses" value={fmt(expense)} color="error.main" />
      <StatCard
        label="Savings"
        value={fmt(savings)}
        color={savings < 0 ? "error.main" : "primary.main"}
      />
      <StatCard label="Savings rate" value={fmtPct(savingsRate)} />
    </Box>
  );
}
