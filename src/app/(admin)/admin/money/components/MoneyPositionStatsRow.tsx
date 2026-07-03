import { Box } from "@mui/material";
import type { MoneyDashboardData } from "@/types";
import { fmt, fmtCurrency, fmtDate } from "../format";
import StatCard from "./StatCard";

interface MoneyPositionStatsRowProps {
  data: MoneyDashboardData;
}

export default function MoneyPositionStatsRow({ data }: MoneyPositionStatsRowProps) {
  return (
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
      <StatCard label="I still owe" value={fmt(data.peopleOwed.owedByMe)} color="warning.main" />
      <StatCard label="Owed to me" value={fmt(data.peopleOwed.owedToMe)} color="info.main" />
    </Box>
  );
}
