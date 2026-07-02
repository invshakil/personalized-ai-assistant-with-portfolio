import { Box, Card, CardContent, Typography } from "@mui/material";
import type { PropertyDashboardStats } from "@/types";
import { fmt } from "../format";
import MiniBar from "./MiniBar";

interface YearlyTrendCardProps {
  data: PropertyDashboardStats["yearlyData"];
  year: number;
}

export default function YearlyTrendCard({ data, year }: YearlyTrendCardProps) {
  const activeMonths = data.filter((m) => m.collected > 0 || m.expenses > 0);
  const yearMax = activeMonths.reduce((mx, m) => Math.max(mx, m.collected, m.expenses), 0);
  const yearCollected = data.reduce((s, m) => s + m.collected, 0);
  const yearExpenses = data.reduce((s, m) => s + m.expenses, 0);

  return (
    <Card sx={{ bgcolor: "background.paper", minWidth: 0 }}>
      <CardContent>
        <Box
          sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 2 }}
        >
          <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
            {year} — Yearly Trend
          </Typography>
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Typography variant="caption" sx={{ color: "success.main", fontWeight: 600 }}>
              ● Collected
            </Typography>
            <Typography variant="caption" sx={{ color: "error.main", fontWeight: 600 }}>
              ● Expenses
            </Typography>
          </Box>
        </Box>

        {activeMonths.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            No financial activity recorded for {year} yet.
          </Typography>
        ) : (
          <>
            {data.map((m) => {
              const hasData = m.collected > 0 || m.expenses > 0;
              return (
                <Box
                  key={m.month}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr auto",
                    alignItems: "center",
                    columnGap: 1.5,
                    mb: 1,
                    opacity: hasData ? 1 : 0.4,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {m.label}
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    <MiniBar
                      pct={yearMax > 0 ? (m.collected / yearMax) * 100 : 0}
                      color="success.main"
                    />
                    <MiniBar
                      pct={yearMax > 0 ? (m.expenses / yearMax) * 100 : 0}
                      color="error.main"
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 600,
                      textAlign: "right",
                      color: m.netProfit >= 0 ? "success.main" : "error.main",
                    }}
                  >
                    {fmt(m.netProfit)}
                  </Typography>
                </Box>
              );
            })}

            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                mt: 1.5,
                pt: 1.5,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" color="text.secondary">
                Year to date
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                <Box component="span" sx={{ color: "success.main" }}>
                  {fmt(yearCollected)}
                </Box>
                {" collected · "}
                <Box component="span" sx={{ color: "error.main" }}>
                  {fmt(yearExpenses)}
                </Box>
                {" spent"}
              </Typography>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
