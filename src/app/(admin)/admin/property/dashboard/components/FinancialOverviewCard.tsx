import { Box, Card, CardContent, Typography } from "@mui/material";
import type { PropertyDashboardStats } from "@/types";
import { fmt, MONTHS } from "../format";
import BarRow from "./BarRow";
import MiniStat from "./MiniStat";

interface FinancialOverviewCardProps {
  data: Pick<
    PropertyDashboardStats,
    | "totalExpected"
    | "totalCollected"
    | "totalAdvanceApplied"
    | "totalSettled"
    | "totalExpenses"
    | "netProfit"
    | "yearlyData"
  >;
  month: number;
  year: number;
}

export default function FinancialOverviewCard({ data, month, year }: FinancialOverviewCardProps) {
  const {
    totalExpected,
    totalCollected,
    totalAdvanceApplied,
    totalSettled,
    totalExpenses,
    netProfit,
    yearlyData,
  } = data;
  // Every ratio here measures the month's rent income, which a bill met from a
  // tenant's advance is part of — so they run on `settled`, matching netProfit.
  // `totalCollected` (cash only) is surfaced in the note beside it.
  const collectionPct = totalExpected > 0 ? (totalSettled / totalExpected) * 100 : 0;
  const uncollected = Math.max(0, totalExpected - totalSettled);
  const expensePct = totalSettled > 0 ? (totalExpenses / totalSettled) * 100 : 0;

  const yearSettled = yearlyData.reduce((s, m) => s + m.settled, 0);
  const yearExpenses = yearlyData.reduce((s, m) => s + m.expenses, 0);
  const activeMonths = yearlyData.filter((m) => m.settled > 0 || m.expenses > 0);
  const netMargin = totalSettled > 0 ? Math.round((netProfit / totalSettled) * 100) : 0;
  const ytdNet = yearSettled - yearExpenses;
  const profitableMonths = yearlyData.filter((m) => m.netProfit > 0).length;

  return (
    <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, fontWeight: 600 }}>
          {MONTHS[month - 1]} {year} — Financial Overview
        </Typography>

        <BarRow
          label="Rent collected"
          value={`${fmt(totalSettled)} / ${fmt(totalExpected)}`}
          pct={collectionPct}
          color="success.main"
          note={
            totalExpected > 0
              ? `${fmt(totalCollected)} cash` +
                (totalAdvanceApplied > 0 ? ` · ${fmt(totalAdvanceApplied)} from advances` : "") +
                ` · ${fmt(uncollected)} outstanding`
              : "No rent expected this month"
          }
        />

        <BarRow
          label="Expenses"
          value={fmt(totalExpenses)}
          pct={expensePct}
          color="error.main"
          note={
            totalSettled > 0
              ? `${Math.round(expensePct)}% of rent income`
              : "No income recorded yet"
          }
        />

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            mt: 2,
            pt: 1.5,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Net profit
          </Typography>
          <Typography
            variant="h6"
            sx={{ fontWeight: 700, color: netProfit >= 0 ? "success.main" : "error.main" }}
          >
            {fmt(netProfit)}
          </Typography>
        </Box>

        {/* Derived stats — fill the footer with insight not shown above */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5, mt: 2 }}>
          <MiniStat
            label="Net margin"
            value={`${netMargin}%`}
            sub="of collected rent kept"
            color={netMargin >= 0 ? "success.main" : "error.main"}
          />
          <MiniStat
            label={`Profit · ${year} to date`}
            value={fmt(ytdNet)}
            sub={
              activeMonths.length > 0
                ? `${profitableMonths}/${activeMonths.length} months in profit`
                : "No activity yet"
            }
            color={ytdNet >= 0 ? "success.main" : "error.main"}
          />
        </Box>
      </CardContent>
    </Card>
  );
}
